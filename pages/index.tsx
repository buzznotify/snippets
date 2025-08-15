import React from "react";
import HomeTabs from "../components/HomeTabs";
import { Box, Container, Heading } from "@radix-ui/themes";
import { TooltipProvider } from "@radix-ui/react-tooltip";

const Home = () => {
  return (
    <TooltipProvider>
      <Container className="flex flex-col items-center h-full w-full my-20">
        <Box className="h-full space-y-4">
          <Heading>Snippets</Heading>
          <HomeTabs />
        </Box>
      </Container>
    </TooltipProvider>
  );
};

export default Home;
