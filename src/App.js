import React from "react";

import { ChakraProvider } from "@chakra-ui/react";
import { Routes, Route } from "react-router-dom";
import Promotion from "./Promotion.js";
import BatchSend from "./BatchSend.js";

function App() {
  return (
    <ChakraProvider>
      <Routes>
        <Route path="/" element={<Promotion />} />
        <Route path="/batchSend" element={<BatchSend />} />
      </Routes>
    </ChakraProvider>
  );
}

export default App;
