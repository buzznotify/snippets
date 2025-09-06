import { createOrgAPI, getLocalStorage } from "@/lib/services";
import {
  Badge,
  Box,
  Button,
  CheckboxCards,
  Dialog,
  Flex,
  Select,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";
import React, { useState } from "react";

function CreateOrgModal({ children }) {
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [emails, setEmails] = useState("");
  const createOrg = () => {
    const token = getLocalStorage("token")?.split('"')[1];
    const payload = {
      orgName,
      orgDescription,
      emails,
    };
    createOrgAPI(token, payload).then((response) => {
      console.log(response, "createOrgAPI");
    });
  };
  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>
          Create Organization
        </Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Create a new organization
        </Dialog.Description>
          <Flex direction="column" gap="3">
            <Box>
                <Text as="div" size="2" mb="2" weight="bold">
                  Org Name
                </Text>
                <TextField.Root size="3" type="text" id="orgname" placeholder="Org Name" onChange={(e) => setOrgName(e.target.value)} />
            </Box>
            <Box>
                <Text as="div" size="2" mb="2" weight="bold">
                  Org Description
                </Text>
              <TextField.Root size="3" type="text" id="orgdescription" placeholder="Org Description" onChange={(e) => setOrgDescription(e.target.value)} />
            </Box>
            <Box>
                <Text as="div" size="2" mb="2" weight="bold">
                  Invite Emails
                </Text>
              <TextField.Root size="3" type="text" id="emails" placeholder="Enter emails separated by commas" onChange={(e) => setEmails(e.target.value)} />
            </Box>
          </Flex>
        <Dialog.Close>
        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={createOrg}>
              Create
            </Button>
          </Dialog.Close>
        </Flex>
        </Dialog.Close>
        </Dialog.Content>
    </Dialog.Root>
  );
}

export default CreateOrgModal;
