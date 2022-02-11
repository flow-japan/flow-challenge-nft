import React from "react";

import { ChakraProvider } from "@chakra-ui/react";
import { Routes, Route } from "react-router-dom";
import Promotion from "./Promotion.js";

function App() {
  return (
    <ChakraProvider>
      <Routes>
        <Route path="/" element={<Promotion />} />
      </Routes>
    </ChakraProvider>
  );
}

export default App;
