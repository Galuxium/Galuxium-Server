// BillingPage.tsx

import React from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
// This is your test publishable API key.
const stripePromise = loadStripe('your-test-publishable-api-key');

interface BillingPageProps {}

const BillingPage: React.FC<BillingPageProps> = () => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    // We don’t want to let default form submission happen here,
    // which would refresh the page.
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    const result = await stripe.confirmCardPayment('card-payment-id', {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: 'Your Customer Name',
        },
      },
    });

    if (result.error) {
      // Display error.state.message in your UI.
      console.error(result.error.message);
    } else {
      // The payment has been processed!
      if (result.paymentIntent.status === 'succeeded') {
        // Show a success message to your customer
        // There's a risk of the customer closing their browser or
        // navigating to another page before the checkout session is closed,
        // in that case the session will be expired by the server.
      }
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <form onSubmit={handleSubmit}>
        <CardElement />
        <button type="submit" disabled={!stripe}>
          Pay
        </button>
      </form>
    </div>
  );
};

export default BillingPage;