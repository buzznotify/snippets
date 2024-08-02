import React, { useEffect, useRef, useState } from "react";
import { login, setLocalStorage } from "./_services";
import { Button } from "@radix-ui/themes";
import { Label } from "@radix-ui/react-label";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  let loginUser = async ({ email, password }) => {
    if (!email || !password) {
      alert("Please enter email and password");
    } else if (!email.includes("@")) {
      alert("Please enter a valid email");
    } else {
      const response = await login({ email, password });

      const data = await response?.json();

      if (response?.status === 200) {
        const token = data.token;
        // Save the token to local storage or a cookie.
        // Proceed with logged-in user actions
      } else {
        // Handle login errors appropriately
        console.error(`Login failed: ${data.message}`);
      }

      console.log(response, "response");
      if (data.token) {
        setLocalStorage("token", data.token);
        window.location.href = "/";
      } else {
        alert("Invalid credentials");
        return;
      }
    }
  };

  return (
    <div className="w-full lg:max-w-screen-lg mx-auto h-screen overflow-hidden py-20 flex flex-col space-y-10">
      <div className="flex flex-col space-y-6">
        <h1 className="text-neutral-600 font-semibold text-2xl">Snippets</h1>
        <div className=" flex flex-col border-b border-neutral-600 relative h-16">
          <h1 className="text-white text-5xl absolute bottom-0 left-0 pb-4 border-b border-lime-400">
            Sign In
          </h1>
          {/* <a className="text-neutral-600 text-lg absolute bottom-4 right-0">
            Signup
          </a> */}
        </div>
      </div>
      <div className="flex flex-col space-y-6">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label className="text-neutral-500" htmlFor="email">
            Email
          </Label>
          <input
            className="bg-neutral-700 border border-neutral-500 text-neutral-400 h-12 text-sm "
            type="email"
            id="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label className="text-neutral-500" htmlFor="email">
            Password
          </Label>
          <input
            className="bg-neutral-700 border border-neutral-500 text-neutral-400 h-12 text-sm"
            type="password"
            id="email"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <Button className="bg-lime-700 border border-lime-400 rounded-none text-white w-max px-8 py-4 text-sm font-semibold hover:bg-lime-600 h-12">
        Login
      </Button>
    </div>
  );
};

export default Login;
