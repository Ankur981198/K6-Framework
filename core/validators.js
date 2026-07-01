import { check } from 'k6';

export function validateLogin(response, body) {
  return check(response, {
    'Login - Status is 200': (r) => r.status === 200,
    'Login - Token exists': () => !!body.token,
    'Login - Token is not empty': () => body.token && body.token.length > 50,
  });
}

export function validateAddToCart(response, body) {
  return check(response, {
    'AddToCart - Status is 200': (r) => r.status === 200,
    'AddToCart - Message exists': () => !!body.message,
    'AddToCart - Message is not empty': () => body.message && body.message.length > 0,
    'AddToCart - Product added successfully': () => body.message === 'Product Added To Cart',
  });
}


export function validateCreateOrder(response, body) {

    check(response, {   "CreateOrder - Status is 201": r => r.status === 201,});
    if (response.status !== 201) {
        return;
    }
    check(body, {
        "CreateOrder - Orders exists": b => !!b.orders,
        "CreateOrder - Orders is not empty": b => b.orders.length > 0,
        "CreateOrder - Product order ID exists": b => !!b.productOrderId,
        "CreateOrder - Product order ID is not empty": b => b.productOrderId.length > 0,
        "CreateOrder - Order placed successfully": b => b.message === "Order Placed Successfully",
    });
}

export function validateLoginNegative(response, body) {

  return check(response, {
    "LoginNegative - Status is 400": r => r.status === 400,
    "LoginNegative - Message exists": () => !!body.message,
    "LoginNegative - Message is not empty": () => body.message.length > 0,
    "LoginNegative - Valid error message": () => {
  const message = (body.message || "").toLowerCase();

  return (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("incorrect") ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    message.includes("access denied") ||
    message.includes("not found") ||
    message.includes("validation") ||
    message.includes("expired") ||
    message.includes("session timeout") ||
    message.includes("login")
  );
},
});

}

export function validateAddToCartNegative(response, body) {

  const result = check(response, {
    "AddToCartNegative - Status is 500": (r) => r.status === 500,
    "AddToCartNegative - Error type exists": () => !!body.type,
    "AddToCartNegative - Error type is correct": () =>body.type === "Something Went Wrong",
    "AddToCartNegative - Message field exists": () =>body.message !== undefined,

  });
  return result;
}

export function validateCreateOrderNegative(response, body) {

  const result = check(response, {

  "CreateOrderNegative - Status is NOT success" : (r) => r.status !== 201,
  "CreateOrderNegative - Status is error (400/422/500)" : (r) =>r.status === 400 || r.status === 422 || r.status === 500,
  "CreateOrderNegative - Response body exists" : () => body !== undefined && body !== null,
  });

  return result;
}