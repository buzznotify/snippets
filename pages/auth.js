import React, { useEffect, useRef, useState } from "react";
import { getLocalStorage, login, setLocalStorage } from "./_services";
import { Box, Button, Flex, Heading, Tabs, TextField } from "@radix-ui/themes";
import { Label } from "@radix-ui/react-label";
import AuthTabs from "./_components/AuthTabs";

const Login = () => {
  const checkToken = () => {
    const token = getLocalStorage("token")?.split('"')[1];
    if (token) {
      // window.location.href = "/";
    }
  };

  useEffect(() => {
    checkToken();
  }, []);
  return (
    <Box className="w-full lg:max-w-screen-lg mx-auto h-screen overflow-auto py-20 flex flex-col space-y-10">
      <Box className="flex flex-col space-y-6 h-full">
        <Heading className="text-neutral-600 font-semibold text-2xl">
          Snippets
        </Heading>
        <AuthTabs />
      </Box>
    </Box>
  );
};

export default Login;
