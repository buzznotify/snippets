import React, { useEffect } from "react";
import { removeLocalStorage } from "../../lib/services";
import { Callout, Container, Spinner } from "@radix-ui/themes";
import { LogOutIcon } from "lucide-react";

const Logout = () => {
  useEffect(() => {
    removeLocalStorage("token");
    removeLocalStorage("orgId");
    window.location.href = "/auth";
  }, []);
  return (
    <Container className="flex flex-col items-center h-full w-full p-20">
    <Callout.Root color="red">
	<Callout.Icon>
        <Spinner />
	</Callout.Icon>
	<Callout.Text>
		Logging out...
	</Callout.Text>
    </Callout.Root>
    </Container>

  )
};

export default Logout;