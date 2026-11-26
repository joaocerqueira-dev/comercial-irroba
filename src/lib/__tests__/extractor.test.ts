import { describe, expect, it } from "vitest";
import { detectPlatform } from "@/lib/scraper/platform-detector";
import { extractStoreFromHtml, parseBrlPrice } from "@/lib/scraper/store-extractor";

describe("Platform Detection & Store HTML Extraction", () => {
  it("detects common Brazilian e-commerce platforms accurately", () => {
    expect(detectPlatform('<script src="https://d26lpennugtm8s.cloudfront.net/assets/nube.js"></script>')).toBe(
      "Nuvemshop"
    );
    expect(detectPlatform('<link href="https://images.tcdn.com.br/theme.css" />')).toBe("Tray");
    expect(detectPlatform('<script src="https://cdn.awsli.com.br/app.js"></script>')).toBe("Loja Integrada");
    expect(detectPlatform('<script src="https://cdn.shopify.com/s/files/shop.js"></script>')).toBe("Shopify");
    expect(detectPlatform('<div class="woocommerce-page"></div>')).toBe("WooCommerce");
    expect(detectPlatform('<body class="theme-_lime"></body>')).toBe("Irroba");
  });

  it("parses Brazilian currency strings cleanly", () => {
    expect(parseBrlPrice("R$ 1.299,90")).toBe(1299.9);
    expect(parseBrlPrice("249,00")).toBe(249);
    expect(parseBrlPrice("R$ 89,95 à vista")).toBe(89.95);
    expect(parseBrlPrice("")).toBeUndefined();
  });

  it("extracts logo, categories, banners, products, and WhatsApp from Nuvemshop HTML fixture", () => {
    const html = `<!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <title>Estilo Veggie Shoes | Calçados Veganos</title>
        <meta property="og:site_name" content="Estilo Veggie Shoes" />
        <meta name="description" content="Sapatos e botas veganas artesanais." />
        <script src="https://d26lpennugtm8s.cloudfront.net/stores/123/nube.js"></script>
      </head>
      <body>
        <header>
          <div class="js-logo-container">
            <img src="//cdn.example.com/logo-veggie.png" alt="Logo" />
          </div>
          <nav>
            <a class="js-nav-list-link" href="/botas">Botas</a>
            <a class="js-nav-list-link" href="/tenis">Tênis</a>
            <a class="js-nav-list-link" href="/sandalias">Sandálias</a>
          </nav>
        </header>
        <main>
          <div class="js-home-slider">
            <img data-src="https://cdn.example.com/banner-veggie.jpg" alt="Banner" />
          </div>
          <div class="js-item-product">
            <a href="/produtos/bota-eco"><img data-src="https://cdn.example.com/bota.jpg" /></a>
            <div class="js-item-name">Bota Eco Couro Vegetal</div>
            <span class="js-compare-price-display">R$ 399,90</span>
            <span class="js-price-display">R$ 329,90</span>
          </div>
          <div class="js-item-product">
            <a href="/produtos/tenis-linho"><img src="https://cdn.example.com/tenis.jpg" /></a>
            <div class="js-item-name">Tênis Linho Natural</div>
            <span class="js-price-display">R$ 219,00</span>
          </div>
        </main>
        <footer>
          <a href="https://wa.me/5511999887766">WhatsApp</a>
          <a href="https://instagram.com/estiloveggieshoes">Instagram</a>
        </footer>
      </body>
    </html>`;

    const extracted = extractStoreFromHtml(html, "https://estiloveggieshoes.com.br/");

    expect(extracted.detectedPlatform).toBe("Nuvemshop");
    expect(extracted.storeName).toBe("Estilo Veggie Shoes");
    expect(extracted.logoUrl).toBe("https://cdn.example.com/logo-veggie.png");
    expect(extracted.categories.map((c) => c.label)).toEqual(["Botas", "Tênis", "Sandálias"]);
    expect(extracted.banners[0]?.imageUrl).toBe("https://cdn.example.com/banner-veggie.jpg");
    expect(extracted.products).toHaveLength(2);
    expect(extracted.products[0]).toMatchObject({
      title: "Bota Eco Couro Vegetal",
      price: 329.9,
      compareAtPrice: 399.9,
      imageUrl: "https://cdn.example.com/bota.jpg",
    });
    expect(extracted.contacts.whatsapp).toBe("5511999887766");
  });

  it("extracts products from modern Nuvemshop .product_card and embedded JSON scripts", () => {
    const html = `<!DOCTYPE html>
    <html>
      <head><title>Estilo Veggie</title></head>
      <body>
        <article class="product_card">
          <img class="product_card_photo" src="//cdn.example.com/coturno.webp" />
          <div class="product_card_infos">
            <h3 class="product_card_name"><a href="/produtos/coturno">Coturno Inglês Preto</a></h3>
            <p class="product_card_price"><span class="product_card_price_now">R$349,90</span></p>
          </div>
        </article>
        <script type="application/json">
          {"id":362276490,"name":"Creeper Acamurçado Preto","url":"https://estiloveggieshoes.com.br/produtos/creeper","price_short":"R$289,90","compare_at_price_short":"R$329,90","media":[{"url":"//cdn.example.com/creeper.webp"}]}
        </script>
      </body>
    </html>`;

    const extracted = extractStoreFromHtml(html, "https://estiloveggieshoes.com.br/");
    expect(extracted.products).toHaveLength(2);
    expect(extracted.products.map((p) => p.title)).toContain("Coturno Inglês Preto");
    expect(extracted.products.map((p) => p.title)).toContain("Creeper Acamurçado Preto");
  });

  it("extracts .header_nav_link categories and multi-slot banners (hero, slim, mood, secondary)", () => {
    const html = `<!DOCTYPE html>
    <html>
      <head><title>Estilo Veggie</title></head>
      <body>
        <div class="header">
          <a class="header_nav_link" href="/lancamentos">Lançamentos</a>
          <a class="header_nav_link" href="/coturnos">Coturnos</a>
          <a class="header_nav_link" href="/creepers">Creepers</a>
          <a class="header_nav_link" href="/sapatos">Sapatos</a>
        </div>
        <main>
          <section data-store="home-hero"><img src="https://cdn.example.com/hero1.webp" /></section>
          <section data-store="home-mood">
            <h2>Escolha seu mood</h2>
            <a href="/coturnos"><img src="https://cdn.example.com/mood1.webp" /><span>Coturnos</span></a>
            <a href="/creepers"><img src="https://cdn.example.com/mood2.webp" /><span>Creepers</span></a>
          </section>
          <section data-store="home-benefits"><img class="benefits_image" src="https://cdn.example.com/ben1.webp" /></section>
          <section data-store="home-banner-slim"><img src="https://cdn.example.com/slim.webp" /></section>
          <section data-store="home-banner-full"><img src="https://cdn.example.com/full.webp" /></section>
        </main>
      </body>
    </html>`;

    const extracted = extractStoreFromHtml(html, "https://estiloveggieshoes.com.br/");
    expect(extracted.categories.map((c) => c.label)).toEqual([
      "Lançamentos",
      "Coturnos",
      "Creepers",
      "Sapatos",
    ]);
    expect(extracted.sectionHeadings).toContain("Escolha seu mood");
    expect(extracted.banners.map((b) => b.slot)).toEqual([
      "hero",
      "slim",
      "mood",
      "mood",
      "secondary",
      "benefits",
    ]);
  });

  it("preserva whatsapp-image / modelo / amarelo, descarta $image e extrai Loja Integrada e contatos estendidos", () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta property="og:site_name" content="Ateliê Amarílis" />
          <script src="https://cdn.awsli.com.br/app.js"></script>
        </head>
        <body>
          <header>
            <a class="header-logo"><img data-src="https://cdn.awsli.com.br/logo-loja.png" src="/assets/blank.gif" /></a>
            <ul class="menu superior">
              <li class="nivel-um"><a href="/vestidos">Vestidos</a></li>
              <li class="nivel-um"><a href="/saias">Saias</a></li>
              <li class="nivel-um"><a href="/conjuntos">Conjuntos</a></li>
              <li class="nivel-um"><a href="/blusas">Blusas</a></li>
            </ul>
          </header>
          <template><img src="https://cdn.awsli.com.br/template-ignorado.jpg" /></template>
          <section class="secao-banners">
            <div class="flexslider">
              <ul class="slides">
                <li>
                  <picture>
                    <source class="src-desktop" srcset="https://cdn.awsli.com.br/banner-whatsapp-image-2026-03-01.jpg 1x" />
                    <img src="https://cdn.awsli.com.br/banner-mobile.jpg" alt="Coleção Nova" />
                  </picture>
                </li>
                <li>
                  <img data-lazy="https://cdn.awsli.com.br/$image" src="/placeholder.png" />
                </li>
              </ul>
            </div>
          </section>
          <div class="listagem-item">
            <a href="/vestido-modelo-amarelo">
              <img data-original="https://cdn.awsli.com.br/vestido-modelo-amarelo.jpg" src="/loading.gif" />
            </a>
            <span class="nome-produto">Vestido Midi Amarelo</span>
            <span class="preco-promocional">R$ 259,90</span>
          </div>
          <footer>
            <a href="https://facebook.com/atelieamarilis">Facebook</a>
            <a href="tel:+551633339999">(16) 3333-9999</a>
            <address>Rua das Acácias, 450 - Franca/SP</address>
            <p>CNPJ: 12.345.678/0001-90</p>
          </footer>
        </body>
      </html>
    `;

    const extracted = extractStoreFromHtml(html, "https://atelieamarilis.com.br/");
    expect(extracted.detectedPlatform).toBe("Loja Integrada");
    expect(extracted.logoUrl).toBe("https://cdn.awsli.com.br/logo-loja.png");
    expect(extracted.categories.map((c) => c.label)).toEqual([
      "Vestidos",
      "Saias",
      "Conjuntos",
      "Blusas",
    ]);
    expect(extracted.banners.some((b) => b.imageUrl.includes("whatsapp-image"))).toBe(true);
    expect(extracted.banners.some((b) => b.imageUrl.includes("$image"))).toBe(false);
    expect(extracted.banners.some((b) => b.imageUrl.includes("template-ignorado"))).toBe(false);
    expect(extracted.products[0]?.imageUrl).toBe("https://cdn.awsli.com.br/vestido-modelo-amarelo.jpg");
    expect(extracted.contacts.facebook).toBe("https://facebook.com/atelieamarilis");
    expect(extracted.contacts.phone).toBe("+551633339999");
    expect(extracted.contacts.cnpj).toBe("12.345.678/0001-90");
    expect(extracted.contacts.address).toContain("Franca/SP");
  });
});
