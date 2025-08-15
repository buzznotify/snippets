import { Label } from "@radix-ui/react-label";
import { Box, Button, Card, Flex, TextField } from "@radix-ui/themes";
import React, { useState } from "react";
import { loginAPI, setLocalStorage } from "../pages/_services";

function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginUser = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
    } else if (!email.includes("@")) {
      alert("Please enter a valid email");
    } else {
      try {
        const response = await loginAPI({ email, password });
        const data = await response?.json();

        if (response?.ok) {
          setLocalStorage("token", data.token);
          window.location.href = "/";
        } else {
          alert(data.message || "Invalid credentials");
        }
      } catch (error) {
        console.error("Login failed:", error);
        alert("An error occurred during login.");
      }
    }
  };

  return (
    <Flex justify="center" align="center" className="w-full h-5/6">
      <Card variant="classic" className="w-5/12">
        <Flex direction="column" gap="24px">
          <Box>
            <Label className="text-neutral-500" htmlFor="email">
              Email
            </Label>
            <Box>
              <TextField.Root
                size="3"
                type="email"
                id="email"
                placeholder="Email"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              />
            </Box>
          </Box>
          <Box>
            <Label className="text-neutral-500" htmlFor="password">
              Password
            </Label>
            <Box>
              <TextField.Root
                size="3"
                type="password"
                id="password"
                placeholder="••••••••"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              />
            </Box>
          </Box>
          <Button onClick={loginUser}>Sign In</Button>
        </Flex>
      </Card>
    </Flex>
  );
}

export default Signin;