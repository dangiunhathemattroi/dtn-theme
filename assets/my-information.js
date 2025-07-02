class MyInformation extends HTMLElement {
  constructor() {
    super();
    this.allField = false;
    this.customerInformation = undefined;
    this.storefrontUrl = `/api/2025-07/graphql.json`;
    this.storefrontAccessToken = this.dataset.token;
    this.phoneLibSrc = 'https://cdn.jsdelivr.net/npm/intl-tel-input@25.2.0/build';
    this.vnCountryCode = 'vn';
    this.loading = false;
  }

  connectedCallback() {
    document.addEventListener('DOMContentLoaded', () => {
      this.loadPhoneLib();
    });
    this.hasAllField();
    this.customerInformation = this.getFormData();
    this.removeRequiredErrorEvent();
    this.initEventListener();
    
  }

  loadPhoneLib() {
    const script = document.createElement('script');
    script.src = `${this.phoneLibSrc}/js/intlTelInput.min.js`;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      this.initPhoneInput();
    };

    script.onerror = () => {
      console.error('Failed to load phone number library');
    };
  }

  initPhoneInput() {
    this.phoneField = this.querySelector('#phone');
    this.phoneInput = window.intlTelInput(this.phoneField, {
      initialCountry: this.vnCountryCode,
      dropdownContainer: window.innerWidth < 768 ? document.body : null,
      loadUtils: () => import(`${this.phoneLibSrc}/js/utils.js`),
    });
  }

  initEventListener() {
    const saveButton = this.querySelector('.btn-save');
    saveButton.addEventListener('click', async () => await this.updateCustomer());
    document.addEventListener('DOMContentLoaded', function () {
      const phoneInput = document.querySelector('input[name="phone"]');
      if (phoneInput) {
        phoneInput.addEventListener('input', function (e) {
          this.value = this.value.replace(/[^0-9]/g, '');
        });
      }
    });
  }

  async updateCustomer() {
    if (this.loading) return;
    const updateData = this.getFormData();
    if (!this.validateData(updateData)) return;
    console.log(JSON.stringify(updateData),
                JSON.stringify(this.customerInformation));
    if (JSON.stringify(updateData) == JSON.stringify(this.customerInformation)) return;
    this.loading = true;

    console.log(1);

    document.dispatchEvent(
      new CustomEvent('loading-state', {
        detail: {
          loading: true,
        },
      })
    );

    try {
      const token = await this.createCustomerAccessToken(updateData.email, this.confirmPassword?.value || '');
      await this.callCustomerUpdate(token, updateData);
      location.reload();
    } catch (err) {
      this.loading = false;
      document.dispatchEvent(
        new CustomEvent('loading-state', {
          detail: {
            loading: false,
          },
        })
      );
      const errorMessage = this.querySelector('.error-message');
      if (errorMessage) { 
        errorMessage.textContent = err.message || 'An error occurred while updating your information.';
        errorMessage.classList.add('visible');
      }
    } finally {
      this.loading = false;
      document.dispatchEvent(
        new CustomEvent('loading-state', {
          detail: {
            loading: false,
          },
        })
      );
    }
  }

  async createCustomerAccessToken(email, password) {
    const query = `
      mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken { accessToken }
          customerUserErrors { message }
        }
      }
    `;

    const variables = { input: { email, password } };
    const res = await fetch(this.storefrontUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await res.json();
    const errors = json.data.customerAccessTokenCreate.customerUserErrors;
    if (errors.length > 0) throw new Error(errors[0].message);
    return json.data.customerAccessTokenCreate.customerAccessToken.accessToken;
  }

  async callCustomerUpdate(customerAccessToken, updateData) {
    const query = `
      mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
        customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
          customer {
            id
            firstName
            lastName
            email
            phone
          }
          customerUserErrors { message }
        }
      }
    `;

    const customer = {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      email: updateData.email,
      phone: updateData.phone || null,
    };

    const variables = { customerAccessToken, customer };
    const res = await fetch(this.storefrontUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await res.json();
    const errors = json.data.customerUpdate.customerUserErrors;
    if (errors.length > 0) throw new Error(errors[0].message);
  }

  validateData(updateData) {
    let valid = true;
    if (!this.allField) return false;
    this.addRequiredError();
    if (!updateData.firstName?.trim() || !updateData.email?.trim()) valid = false;

    if (updateData.email?.trim() && !this.validateEmail(updateData.email.trim())) {
      const emailRequiredField = this.email.closest('.required-field');
      emailRequiredField.classList = 'required-field invalid-error';
      valid = false;
    }

    if (this.confirmPassword?.value) {
      const confirmRequiredField = this.confirmPassword.closest('.required-field');
      confirmRequiredField.classList = 'required-field invalid-error';
      valid = false;
    }
    return valid;
  }

  validateEmail(email) {
    return String(email)
      .toLowerCase()
      .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  }

  hasAllField() {
    this.customerId = this.querySelector('input[name="customer-id"]');
    this.firstName = this.querySelector('input[name="first-name"]');
    this.email = this.querySelector('input[name="email"]');
    this.confirmPassword = this.querySelector('input[name="confirm-password"]');
    if (this.customerId && this.firstName && this.email && this.confirmPassword) {
      this.allField = true;
    }
    this.requiredFields = [this.firstName, this.email, this.confirmPassword];
  }

  addRequiredError() {
    if (!this.requiredFields?.length) return;
    this.requiredFields.forEach((field) => {
      if (!field?.value) {
        const requiredField = field.closest('.required-field');
        if (requiredField) requiredField.classList = 'required-field error-required';
      }
    });
  }

  removeRequiredErrorEvent() {
    if (!this.requiredFields?.length) return;
    this.requiredFields.forEach((field) => {
      if (!field) return;
      field.addEventListener('change', () => {
        const requiredField = field.closest('.required-field');
        if (requiredField) requiredField.classList = 'required-field';
      });
    });
  }

  getFormData() {    
    return {
      customerId: this.customerId.value,
      firstName: this.firstName.value,
      lastName: this.lastName?.value || '',
      email: this.email.value,
      phone: this.phoneInput?.getNumber() || ''
    };
  }
}

customElements.define('my-information', MyInformation);
