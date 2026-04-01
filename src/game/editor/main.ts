const backBtn = document.getElementById('backToGameBtn');

if (backBtn instanceof HTMLButtonElement) {
  backBtn.addEventListener('click', () => {
    window.location.href = '/';
  });
}
