/**
 * The Langford — Interest List form handling
 * Client-side validation + Cloudflare Turnstile + serverless submission.
 * No secrets live in this file; the Turnstile site key is public by design,
 * and Resend/API credentials are only ever used server-side (see /functions).
 */
(function () {
  'use strict';

  const form = document.getElementById('interest-form');
  if (!form) return;

  const statusBox = document.getElementById('form-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  function setStatus(message, type) {
    statusBox.textContent = message;
    statusBox.className = 'form-status is-visible' + (type ? ' is-' + type : '');
    statusBox.setAttribute('role', type === 'error' ? 'alert' : 'status');
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validPhone(value) {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10;
  }

  function fieldError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    let hint = field.parentElement.querySelector('.field-error');
    if (!hint) {
      hint = document.createElement('span');
      hint.className = 'field-error field-hint';
      hint.style.color = '#B4432D';
      field.parentElement.appendChild(hint);
    }
    hint.textContent = message;
  }

  function clearFieldError(field) {
    field.removeAttribute('aria-invalid');
    const hint = field.parentElement.querySelector('.field-error');
    if (hint) hint.remove();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.elements.name;
    const email = form.elements.email;
    const phone = form.elements.phone;
    const moveInDate = form.elements.moveInDate;

    let valid = true;
    [name, email, phone, moveInDate].forEach(clearFieldError);

    if (!name.value.trim() || name.value.trim().length < 2) {
      fieldError(name, 'Please enter your full name.');
      valid = false;
    }
    if (!validEmail(email.value.trim())) {
      fieldError(email, 'Please enter a valid email address.');
      valid = false;
    }
    if (!validPhone(phone.value.trim())) {
      fieldError(phone, 'Please enter a valid phone number.');
      valid = false;
    }
    if (!moveInDate.value) {
      fieldError(moveInDate, 'Please select your ideal move-in date.');
      valid = false;
    }

    const turnstileResponse = form.querySelector('[name="cf-turnstile-response"]');
    const turnstileToken = turnstileResponse ? turnstileResponse.value : '';

    if (!valid) {
      setStatus('Please correct the highlighted fields and try again.', 'error');
      return;
    }

    if (window.turnstile && !turnstileToken) {
      setStatus('Please complete the verification check before submitting.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const res = await fetch('/api/interest-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.value.trim(),
          email: email.value.trim(),
          phone: phone.value.trim(),
          moveInDate: moveInDate.value,
          turnstileToken: turnstileToken,
          website: form.elements.website ? form.elements.website.value : '' // honeypot
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        form.reset();
        if (window.turnstile) window.turnstile.reset();
        setStatus('You’re on the list. Look out for a confirmation email from our leasing team shortly.', 'success');
      } else {
        setStatus(data.message || 'Something went wrong submitting your request. Please try again.', 'error');
      }
    } catch (err) {
      setStatus('We couldn’t reach our server. Please check your connection and try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Join the Interest List';
    }
  });
})();
