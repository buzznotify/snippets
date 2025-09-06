import React from "react";
import {
  Badge,
  Button,
  AlertDialog,
  Flex,
} from "@radix-ui/themes";
import { deleteOrgAPI, getLocalStorage } from "@/lib/services";

function DeleteOrgModal({ children, org }) {
  const onDeleteOrg = () => {
    const token = getLocalStorage("token")?.split('"')[1];
    const payload = {
      org_id: org.id,
    };
    deleteOrgAPI(token, payload).then((response) => {
      console.log(response, "deleteOrgAPI");
    });
  };
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>{children}</AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>
          Delete
          <Badge color="red" size="1" mx="2">
            {org.name}({org.id})
          </Badge>
          ?
        </AlertDialog.Title>
        <AlertDialog.Description size="2" mb="4">
          Clicking on delete, will permanently delete your organization!
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Action>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Action>
          <AlertDialog.Action>
            <Button color="red" onClick={onDeleteOrg}>
              Delete
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

export default DeleteOrgModal;
