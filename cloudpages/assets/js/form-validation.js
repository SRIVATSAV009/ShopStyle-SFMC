/*
  Shared client-side validation for ShopStyle CloudPages forms.
  Referenced by preference-center.html, profile-update.html, subscription-management.html,
  and smart-capture/newsletter-signup.html. Client-side validation is UX-only — every form also
  re-validates server-side in SSJS before writing to any Data Extension (see each page's
  <script runat="server"> block), since client-side checks can always be bypassed.
*/
(function () {
  "use strict";

  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

  function showError(input, message) {
    input.classList.add("sp-invalid");
    var errorEl = document.getElementById(input.id + "-error");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add("sp-visible");
    }
  }

  function clearError(input) {
    input.classList.remove("sp-invalid");
    var errorEl = document.getElementById(input.id + "-error");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.classList.remove("sp-visible");
    }
  }

  function validateField(input) {
    var value = input.value.trim();
    var required = input.hasAttribute("required");

    if (required && value === "") {
      showError(input, "This field is required.");
      return false;
    }

    if (input.type === "email" && value !== "" && !EMAIL_PATTERN.test(value)) {
      showError(input, "Enter a valid email address.");
      return false;
    }

    if (input.type === "tel" && value !== "" && !PHONE_PATTERN.test(value.replace(/[\s()-]/g, ""))) {
      showError(input, "Enter a valid phone number (10-15 digits).");
      return false;
    }

    if (input.type === "date" && input.dataset.maxToday === "true" && value !== "") {
      var entered = new Date(value);
      if (entered > new Date()) {
        showError(input, "Date cannot be in the future.");
        return false;
      }
    }

    clearError(input);
    return true;
  }

  function initFormValidation(formId) {
    var form = document.getElementById(formId);
    if (!form) return;

    var inputs = form.querySelectorAll("input[data-validate], select[data-validate]");
    inputs.forEach(function (input) {
      input.addEventListener("blur", function () { validateField(input); });
    });

    form.addEventListener("submit", function (evt) {
      var isValid = true;
      inputs.forEach(function (input) {
        if (!validateField(input)) isValid = false;
      });
      if (!isValid) {
        evt.preventDefault();
        var firstInvalid = form.querySelector(".sp-invalid");
        if (firstInvalid) firstInvalid.focus();
      }
    });
  }

  window.ShopStyleFormValidation = { init: initFormValidation };
})();
