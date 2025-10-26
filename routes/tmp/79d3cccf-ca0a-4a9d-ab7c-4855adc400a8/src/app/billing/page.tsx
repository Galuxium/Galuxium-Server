// BillingPage.tsx

import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

import CheckoutForm from './CheckoutForm';
import CustomerPortal from './CustomerPortal';

interface BillingPageProps {
  planId: string;
  customerId: string;
}

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY as string);

const BillingPage: React.FC<BillingPageProps> = ({ planId, customerId }) => (
  <Elements stripe={stripePromise}>
    <div className="billing-page">
      <h2>Subscription Plan</h2>
      <CheckoutForm planId={planId} />
      <h2>Customer Portal</h2>
      <CustomerPortal customerId={customerId} />
    </div>
  </Elements>
);

export default BillingPage;

// CheckoutForm.tsx

import React from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface CheckoutFormProps {
  planId: string;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ planId }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    const result = await stripe.confirmCardPayment(process.env.REACT_APP_STRIPE_CONFIRM_CARD_PAYMENT_CLIENT_SECRET as string, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: 'Your Customer Name',
        },
      },
    });

    if (result.error) {
      console.error(result.error);
    } else {
      if (result.paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        Pay
      </button>
    </form>
  );
};

export default CheckoutForm;

// CustomerPortal.tsx

import React from 'react';
import { useStripe, useElements } from '@stripe/react-stripe-js';

interface CustomerPortalProps {
  customerId: string;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ customerId }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleClick = async () => {
    if (!stripe) {
      return;
    }

    const result = await stripe.redirectToCheckout({
      sessionId: process.env.REACT_APP_STRIPE_CUSTOMER_PORTAL_SESSION_ID as string,
      customer: customerId,
    });

    if (result.error) {
      console.error(result.error);
    }
  };

  return (
    <button type="button" onClick={handleClick}>
      Manage Subscription
    </button>
  );
};

export default CustomerPortal;