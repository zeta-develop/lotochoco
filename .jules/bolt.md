## 2024-05-22 - Optimización de componentes NumPad y AmountPad

**Aprendizaje:** Los componentes de teclados numéricos (`NumPad` y `AmountPad`) definían arreglos estáticos dentro del cuerpo del componente y sus métodos internos no estaban memorizados, lo que provocaba re-renders innecesarios en componentes padre pesados (como `ResultsManager` y `POSSale`).

**Acción:** Aplicar `React.memo` a los componentes e instanciar los arreglos estáticos fuera del ciclo de renderizado.
