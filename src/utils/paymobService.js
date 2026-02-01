const axios = require('axios');

const PAYMOB_BASE_URL = process.env.PAYMOB_BASE_URL;
const API_KEY = process.env.PAYMOB_API_KEY;
const INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;

const getAuthToken = async () => {
    try {
        const response = await axios.post(`${PAYMOB_BASE_URL}/auth/tokens`, {
            api_key: API_KEY,
        });

        return response.data.token;
    } catch (error) {
        console.error('Error getting Paymob auth token:', error.response?.data || error.message);
        throw error;
    }
};

// مثال لإنشاء order على Paymob (500 جنيه = 50000 قرش)
const createPaymobOrder = async (amountCents, merchantOrderId) => {
    const authToken = await getAuthToken();

    const response = await axios.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: 'EGP',
        merchant_order_id: merchantOrderId,
        items: [],
    });

    return response.data;
};

// مثال لإنشاء Payment Key (لـ iframe)
const createPaymentKey = async (orderId, amountCents, billingData = {}) => {
    const authToken = await getAuthToken();

    // ✅ Enforce billing data مع قيم افتراضية
    const enforcedBillingData = {
        first_name: billingData.first_name || 'User',
        last_name: billingData.last_name || 'NA',
        email: billingData.email || 'noemail@example.com',
        phone_number: billingData.phone_number || '+201000000000',
        apartment: billingData.apartment || 'NA',
        floor: billingData.floor || 'NA',
        street: billingData.street || 'NA',
        building: billingData.building || 'NA',
        shipping_method: billingData.shipping_method || 'NA',
        postal_code: billingData.postal_code || 'NA',
        city: billingData.city || 'Cairo',
        country: billingData.country || 'EG',
        state: billingData.state || 'NA',
    };

    const response = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, {
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderId,
        integration_id: INTEGRATION_ID,
        currency: 'EGP',
        billing_data: enforcedBillingData,
    });

    return response.data;
};

module.exports = {
    getAuthToken,
    createPaymobOrder,
    createPaymentKey,
};