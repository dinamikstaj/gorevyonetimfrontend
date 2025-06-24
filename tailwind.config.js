module.exports = {
  // 'content' alanı, Tailwind'in CSS sınıflarını nerede arayacağını belirler.
  // Bu yollar, projenizdeki tüm JSX/TSX dosyalarını kapsamalıdır.
  // Projenizin yapısına göre bu yolları ayarlamanız gerekebilir (örn. 'src/' klasörünüz varsa).
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',      // Next.js 'pages' dizini
    './components/**/*.{js,ts,jsx,tsx,mdx}', // Paylaşılan bileşenler dizini
    './app/**/*.{js,ts,jsx,tsx,mdx}',        // Next.js 13+ 'app' dizini
    './src/**/*.{js,ts,jsx,tsx,mdx}',        // 'src' klasörünü kullanan projeler için genel yol
  ],
  // 'theme' alanı, Tailwind'in varsayılan tasarım jetonlarını (renkler, fontlar, boşluklar vb.) özelleştirmenizi sağlar.
  theme: {
    extend: {
      // 'extend' bloğu, Tailwind'in varsayılan temasını genişletir, üzerine yazmaz.
      fontFamily: {
        // Özel font aileleri tanımlanabilir.
        // Burada 'Inter' fontu için bir kısayol oluşturulmuştur.
        inter: ['Inter', 'sans-serif'],
      },
      // Diğer özel renkler, boşluklar, gölgeler vb. buraya eklenebilir.
      // Örneğin:
      // colors: {
      //   'custom-blue': '#1DA1F2',
      // },
      // spacing: {
      //   '128': '32rem',
      // },
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  // 'plugins' alanı, Tailwind'e ek işlevsellik katan eklentileri etkinleştirmenizi sağlar.
  // Örneğin, 'typography' eklentisi Markdown içeriğini kolayca stilize etmeye yardımcı olur.
  plugins: [],
};
