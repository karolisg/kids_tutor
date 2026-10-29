export const padScript = `(() => {
  const input = document.querySelector('#answer');
  const pad = document.querySelector('[data-pad]');
  if (!(input instanceof HTMLInputElement) || !pad) return;
  pad.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const key = target.closest('[data-key]')?.getAttribute('data-key');
    if (!key) return;
    if (key === 'back') {
      input.value = input.value.slice(0, -1);
      return;
    }
    if (key === 'sign') {
      input.value = input.value.startsWith('-') ? input.value.slice(1) : '-' + input.value;
      return;
    }
    if (/^\\d$/.test(key) && 8 > input.value.replace('-', '').length) input.value += key;
  });
})();
`;
