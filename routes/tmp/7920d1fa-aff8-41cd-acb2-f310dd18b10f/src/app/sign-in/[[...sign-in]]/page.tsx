// Import necessary modules and components
import React from 'react';
import { ClerkProvider, useUser } from '@clerk/clerk-react';
import { Route, Redirect } from 'react-router-dom';

// Define the interface for the PrivateRouteProps
interface PrivateRouteProps {
  component: any;
  path: string;
  exact: boolean;
}

// Define the PrivateRoute component
const PrivateRoute: React.FC<PrivateRouteProps> = ({
  component: Component,
  path,
  exact,
}) => {
  const { isSignedIn } = useUser();

  return (
    <Route path={path} exact={exact}>
      {isSignedIn ? <Component /> : <Redirect to="/sign-in" />}
    </Route>
  );
};

// Define the SignIn component
const SignIn: React.FC = () => {
  return (
    <div>
      <h1>Sign In</h1>
      {/* Render the Clerk sign-in form here */}
    </div>
  );
};

// Define the App component
const App: React.FC = () => {
  return (
    <ClerkProvider frontendApi="your-clerk-frontend-api">
      <PrivateRoute path="/" exact component={SignIn} />
    </ClerkProvider>
  );
};

// Export the App component
export default App;