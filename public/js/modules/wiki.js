/* Lore & Wiki — evren, karakter geçmişleri, mekanlar, fraksiyonlar */
(function () {
  A.register('wiki', {
    title: 'Lore & Wiki', icon: 'library', group: 'tasarim', full: true,
    async render(el, [id]) {
      const cleanup = await A.docEditor(el, id, {
        col: 'wiki', title: 'Lore & Wiki', subtitle: 'Oyun evreninin ansiklopedisi.', icon: 'scroll-text', itemLabel: 'wiki sayfası',
        categories: ['Karakterler', 'Mekanlar', 'Tarih', 'Fraksiyonlar', 'Eşyalar & Teknoloji', 'Büyü & Yetenekler', 'Yaratıklar', 'Terimler', 'Diğer'],
      });
      this.destroy = cleanup;
    },
  });
})();
