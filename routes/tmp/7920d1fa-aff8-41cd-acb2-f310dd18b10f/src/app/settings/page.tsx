// SettingsPage.tsx

import React from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ClerkProvider, useUser, UserButton, SignInButton, RedirectToSignIn } from '@clerk/clerk-react';

const schema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Email is invalid').required('Email is required'),
});

interface SettingsPageProps {}

const SettingsPage: React.FC<SettingsPageProps> = () => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = (data: any) => {
    // Handle form submission here
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <RedirectToSignIn />;
  }

  return (
    <div>
      <h1>Settings</h1>
      <UserButton />
      <SignInButton />
      <form onSubmit={handleSubmit(onSubmit)}>
        <label htmlFor="firstName">First Name</label>
        <input id="firstName" {...register('firstName')} />
        {errors.firstName && <p>{errors.firstName.message}</p>}

        <label htmlFor="lastName">Last Name</label>
        <input id="lastName" {...register('lastName')} />
        {errors.lastName && <p>{errors.lastName.message}</p>}

        <label htmlFor="email">Email</label>
        <input id="email" {...register('email')} />
        {errors.email && <p>{errors.email.message}</p>}

        <button type="submit">Update</button>
      </form>
    </div>
  );
};

const WrappedSettingsPage = () => {
  return (
    <ClerkProvider frontendApi="your-clerk-frontend-api">
      <SettingsPage />
    </ClerkProvider>
  );
};

export default WrappedSettingsPage;