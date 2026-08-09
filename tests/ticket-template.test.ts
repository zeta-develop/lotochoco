/**
 * Tests para renderTicketTemplate (factura formato boleto hondureño).
 * Ejecutar: node --import tsx --test tests/ticket-template.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { renderTicketTemplate } from "../lib/ticket-template";

const TEMPLATE_HONDURENO = `# {{businessName}}
**Juego:** {{gameName}}
**Venta No:** {{ticketNumber}}
**Fecha:** {{date}}
**Sorteo:** {{scheduleName}}

{{#if client}}* **Cliente:** {{client}}{{/if}}
* **Vendedor:** {{vendorName}}
* **Puesto:** {{terminalName}}

--------------------------------
APUESTA    MONTO    PREMIO
--------------------------------
{{#items}}
{{number}}         {{amount}}       {{prize}}
{{/items}}
--------------------------------
**Total: {{currency}}{{total}}**

*Válido para 1 sorteo*
*Por favor revise su ticket*
*Premio válido por 7 días*`;

const ticket = {
  id: "t1",
  ticketNumber: "#00000042",
  totalAmount: 30,
  status: "active" as const,
  client: "Anielka",
  createdAt: new Date("2026-08-09T15:30:00"),
  updatedAt: new Date("2026-08-09T15:30:00"),
  items: [
    {
      id: "i1",
      ticketId: "t1",
      gameId: "g1",
      number: "08",
      amount: 15,
      schedule: "9:00 PM",
      createdAt: new Date("2026-08-09T15:30:00"),
      game: { id: "g1", name: "Diaria", multiplier: 80 },
    },
    {
      id: "i2",
      ticketId: "t1",
      gameId: "g1",
      number: "80",
      amount: 15,
      schedule: "9:00 PM",
      createdAt: new Date("2026-08-09T15:30:00"),
      game: { id: "g1", name: "Diaria", multiplier: 80 },
    },
  ],
};

const settings = {
  businessName: "Lotería La Fortuna",
  currency: "C$",
  ticketMessage: "¡Buena suerte!",
  vendorName: "Yamileth",
  terminalName: "Puesto J081",
};

describe("renderTicketTemplate (boleto hondureño)", () => {
  test("renderiza encabezado completo: juego, venta, fecha, sorteo, cliente, vendedor, puesto", () => {
    const out = renderTicketTemplate(TEMPLATE_HONDURENO, ticket as any, settings);

    assert.match(out, /Lotería La Fortuna/);
    assert.match(out, /Juego:\*\* Diaria/);
    assert.match(out, /Venta No:\*\* #00000042/);
    assert.match(out, /Sorteo:\*\* 9:00 PM/);
    assert.match(out, /Cliente:\*\* ANIELKA/);
    assert.match(out, /Vendedor:\*\* Yamileth/);
    assert.match(out, /Puesto:\*\* Puesto J081/);
    assert.match(out, /09\/08\/2026/);
  });

  test("renderiza tabla de jugadas con apuesta, monto y premio", () => {
    const out = renderTicketTemplate(TEMPLATE_HONDURENO, ticket as any, settings);

    // Apuestas (números jugados)
    assert.match(out, /\b08\b/);
    assert.match(out, /\b80\b/);
    // Montos
    assert.match(out, /15/);
    // Premios (15 * 80 = 1200)
    assert.match(out, /1200/);
  });

  test("renderiza pie con total y nota de revisión", () => {
    const out = renderTicketTemplate(TEMPLATE_HONDURENO, ticket as any, settings);

    assert.match(out, /Total: C\$30\.00/);
    assert.match(out, /Por favor revise su ticket/);
    assert.match(out, /Válido para 1 sorteo/);
  });

  test("sin cliente, el bloque condicional se omite", () => {
    const sinCliente = { ...ticket, client: null };
    const out = renderTicketTemplate(TEMPLATE_HONDURENO, sinCliente as any, settings);

    assert.doesNotMatch(out, /Cliente:/);
    assert.match(out, /Vendedor:\*\* Yamileth/);
  });

  test("vendedor/puesto por defecto si no hay configuración", () => {
    const out = renderTicketTemplate(TEMPLATE_HONDURENO, ticket as any, { businessName: "X", currency: "C$" });

    assert.match(out, /Vendedor:\*\* /);
    assert.match(out, /Puesto:\*\* /);
  });
});
