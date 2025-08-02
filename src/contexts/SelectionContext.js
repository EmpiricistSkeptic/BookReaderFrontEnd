// file: src/contexts/SelectionContext.js

import React, { createContext, useState, useMemo } from 'react';

// 1. Создаем само "Табло" (Context)
export const SelectionContext = createContext();

// 2. Создаем "Управляющего таблом" (Provider)
// Это компонент-обертка, который будет хранить состояние и предоставлять его всем желающим
export const SelectionProvider = ({ children }) => {
  const [selectedWord, setSelectedWord] = useState(null); // { chunkIndex, wordIndex }

  // useMemo гарантирует, что объект value не будет пересоздаваться без надобности,
  // предотвращая лишние рендеры у потребителей Context.
  const value = useMemo(() => ({
    selectedWord,
    setSelectedWord,
  }), [selectedWord]);

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};