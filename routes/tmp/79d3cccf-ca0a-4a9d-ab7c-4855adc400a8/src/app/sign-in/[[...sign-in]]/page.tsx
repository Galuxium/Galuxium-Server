/// <reference path="../node_modules/@clerk/clerk-react/types/index.d.ts" />

import React from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { useUser } from "@clerk/clerk-react";

interface SignInPageProps {
  clerkFrontendApi: string;
}

const SignInPage: React.FC<SignInPageProps> = (props) => {
  const { isSignedIn, user } = useUser();

  if (isSignedIn) {
    return <div>Welcome, {user.firstName}!</div>;
  }

  return (
    <ClerkProvider frontendApi={props.clerkFrontendApi}>
      <div>
        <h1>Sign In</h1>
        <form>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" name="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" name="password" required />
          <button type="submit">Sign In</button>
        </form>
      </div>
    </ClerkProvider>
  );
};

export default SignInPage;