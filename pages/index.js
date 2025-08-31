import React, { useEffect, useRef, useState } from "react";
// import { login, setLocalStorage } from "./_services";
import HomeTabs from "../components/HomeTabs";
import { Box, Button, Container, Heading } from "@radix-ui/themes";
import CreateKeyModal from "../components/CreateKeyModal";

const Home = () => {
  return (
    <Container className="flex flex-col items-center h-full w-full my-20">
      <Box className="h-full space-y-4">
        <Heading>Snippets</Heading>
        <HomeTabs />
      </Box>
    </Container>
  );
};

export default Home;
