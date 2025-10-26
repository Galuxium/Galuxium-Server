import React from 'react';
import { useRouter } from 'next/router';

import { clerkClient } from '@clerk/nextjs/server';
import { UserProfile } from '@clerk/clerk-sdk-node';

import { Box, Button, Form, FormField, Heading, TextInput } from 'granite-ui';

interface SettingsProps {
  userId: UserProfile['id'];
}

const Settings: React.FC<SettingsProps> = ({ userId }) => {
  const router = useRouter();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await clerkClient.users.updateUser({
      userid: userId,
      set: {
        firstName,
        lastName,
        email,
        phoneNumber,
      },
    });

    router.push('/settings');
  };

  return (
    <Box padding="6">
      <Heading as="h1" size="2xl" mb="4">
        Update Profile
      </Heading>
      <Form onSubmit={handleSubmit}>
        <FormField label="First Name" mb="4">
          <TextInput
            type="text"
            name="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </FormField>
        <FormField label="Last Name" mb="4">
          <TextInput
            type="text"
            name="lastName"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </FormField>
        <FormField label="Email" mb="4">
          <TextInput
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <FormField label="Phone Number" mb="4">
          <TextInput
            type="tel"
            name="phoneNumber"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
          />
        </FormField>
        <Button type="submit" isFullWidth>
          Update Profile
        </Button>
      </Form>
    </Box>
  );
};

export default Settings;