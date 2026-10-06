document.addEventListener('DOMContentLoaded', () => {
  const mobileToggle = document.querySelector('[data-mobile-toggle]');
  const mobileNav = document.querySelector('.mobile-nav');
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => mobileNav.classList.toggle('open'));
  }

  const serviceSelect = document.getElementById('serviceCategory');
  const dynamicFields = document.querySelectorAll('[data-service-field]');
  const selectedField = document.getElementById('selectedServiceFields');

  if (serviceSelect) {
    const showServiceFields = () => {
      const selected = serviceSelect.value;
      dynamicFields.forEach((field) => {
        const matches = field.dataset.serviceField === selected;
        field.hidden = !matches;
      });
      if (selectedField) {
        selectedField.textContent = selected || 'General Service';
      }
    };
    serviceSelect.addEventListener('change', showServiceFields);
    showServiceFields();
  }

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });

  const nav = document.querySelector('.main-nav');
  if (nav) {
    const current = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('a').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === current || (current === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }
});
