import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Text,
  TextField,
} from "@radix-ui/themes";
import {
  getLocalStorage,
  inviteUsersAPI,
} from "../lib/services";

function InviteOrgModal({ children, org }) {
  const [emails, setEmails] = useState("");

  const inviteUsers = () => {
    const token = getLocalStorage("token")?.split('"')[1];
    const payload = {
      org_id: org.id,
      emails,
    };
    inviteUsersAPI(token, payload).then((response) => {
      console.log(response, "inviteUsersAPI");
    });
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger className="w-full h-full">{children}</Dialog.Trigger>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Invite Users to Org</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Invite users to the organization.
        </Dialog.Description>

          <Box>
            <Text as="div" size="2" mb="1" weight="bold">
              Emails
            </Text>
            <TextField.Root
              autoFocus={true}
              onChange={(val) => setEmails(val.target.value)}
              value={emails}
              placeholder="Enter emails separated by commas"
              size="3"
            />
          </Box>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={inviteUsers}>
              Invite
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default InviteOrgModal;
