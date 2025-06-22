class MyAddress extends HTMLElement {
  constructor() {
    super();
    this.appProxyUrl = '/apps/sso';
    this.phoneLibSrc = 'https://cdn.jsdelivr.net/npm/intl-tel-input@25.2.0/build';
    this.accountContainer = this.closest('.account-container');
    this.addressForm = this.querySelector('.address-form-wrapper');
    this.notifyPopupWrapper = this.querySelector('.notify-popup-wrapper');
    this.confirmRemoveAddressPopup = this.notifyPopupWrapper
      ? this.notifyPopupWrapper.querySelector('.remove-address-confirm')
      : null;
    this.invalidAddressNotify = this.notifyPopupWrapper
      ? this.notifyPopupWrapper.querySelector('.invalid-address')
      : null;
    this.language = this.accountContainer ? this.accountContainer.getAttribute('data-language-code') : 'en';
    this.currentPostalCode = '';
    this.thaiCountryCode = 'th';
    this.generateAddress();
    this.loadPhoneLib();
    if (!this.addressForm) {
      return;
    }
    this.initEventListener();
  }

  async generateAddress() {
    const addressWrapper = this.querySelector('.my-address-wrapper');
    this.postalCodeThais = [];
    this.validPostalCodeThais = [];
    this.addressThais = [];
    if (!addressWrapper) {
      return;
    }
    const addressPostalCode = addressWrapper.getAttribute('address-postal-code');
    const customerAddresses = addressWrapper.querySelectorAll('.customer-address');

    if (!addressPostalCode || !customerAddresses || !customerAddresses.length) {
      return;
    }

    await this.getStorageAddressThais(addressPostalCode.split(','));
    customerAddresses.forEach((customerAddress) => {
      const addressRawData = customerAddress.getAttribute('data-address') ?? '';
      const addressData = addressRawData ? JSON.parse(addressRawData) : null;
      const addressPhone = customerAddress.querySelector('.phone');
      const addressPhoneOrigin = addressPhone?.getAttribute('data-phone');

      if (addressPhone && addressPhoneOrigin) {
        addressPhone.innerHTML = `<span>${this.formatThaiPhone(addressPhoneOrigin)}</span>`;
      }

      if (!addressData || !addressData.postal || !addressData.address2 || !addressData.city || !addressData.province) {
        return;
      }

      const addressThai = this.addressThais.find((address) => {
        return address.postalCode == addressData.postal;
      });

      if (!addressThai || !addressThai.value) {
        return;
      }

      const addressDescription = customerAddress.querySelector('.address-description');

      if (!addressDescription) {
        return;
      }

      const subDistrictLine = addressDescription.querySelector('.subdistrict-district');
      const provinceLine = addressDescription.querySelector('.province');

      addressThai.value.forEach((address) => {
        if (
          (addressData.address2 == address.subdistrict.en || addressData.address2 == address.subdistrict.th) &&
          (addressData.city == address.district.en || addressData.city == address.district.th) &&
          (addressData.province == address.province.en || addressData.province == address.province.th) &&
          subDistrictLine &&
          provinceLine
        ) {
          if (this.language == 'en') {
            subDistrictLine.innerHTML = `<span>${address.subdistrict.en}, ${address.district.en}</span>`;
            provinceLine.innerHTML = `<span>${address.province.en}, ${addressData.postal}</span>`;
          } else if (this.language == 'th') {
            subDistrictLine.innerHTML = `<span>${address.subdistrict.th}, ${address.district.th}</span>`;
            provinceLine.innerHTML = `<span>${address.province.th}, ${addressData.postal}</span>`;
          }
        }
      });
    });

    addressWrapper.classList.add('show-customer-address');
  }

  async getStorageAddressThais(postalCodes) {
    await this.getAddressThaiVer();
    const currentAddressThais = JSON.parse(localStorage.getItem('addressThais'));
    if (!currentAddressThais || !currentAddressThais.postalCodes) {
      localStorage.setItem('addressThais', JSON.stringify({ postalCodes: [], addressThais: [] }));
    }

    if (!postalCodes.every((postalCode) => currentAddressThais?.postalCodes?.includes(postalCode))) {
      await this.getAddressByPostalCodes(postalCodes);
    }
    const addressThais = JSON.parse(localStorage.getItem('addressThais'));

    if (addressThais.addressThais && addressThais.addressThais.length) {
      this.postalCodeThais = addressThais.postalCodes;
      this.validPostalCodeThais = addressThais.postalCodes;
      this.addressThais = addressThais.addressThais;
    }
  }

  async getAddressThaiVer() {
    const currentVer = localStorage.getItem('addressThaiVer');
    const response = await fetch(`${this.appProxyUrl}/api/sso/getAddressThaiVer`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'GET',
    }).then((response) => response.json());

    if (!response || !response.success) {
      console.error(`Response status: ${response.status}`);
      return;
    }

    if (currentVer !== response.data.currentVer) {
      localStorage.setItem('addressThais', JSON.stringify({ postalCodes: [], addressThais: [] }));
      localStorage.setItem('addressThaiVer', response.data.currentVer);
    }
  }

  formatThaiPhone(phone) {
    if (phone.startsWith('+66')) {
      phone = '0' + phone.slice(3);
      return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    }

    return phone;
  }

  initEventListener() {
    this.initSelectField();
    this.getAddressFormInput();
    const addNewAddressButton = this.querySelector('button.add-new-button');
    const updateAddressButtons = this.querySelectorAll('button.address-edit');
    const removeAddressButtons = this.querySelectorAll('button.address-remove');
    const closeFormButton = this.addressForm.querySelector('.close-button span');
    const backButton = this.addressForm.querySelector('button.back-button');
    const saveButton = this.addressForm.querySelector('button.save-button');
    const setDefaultButtons = this.querySelectorAll('.icon-turn-off');

    if (addNewAddressButton) {
      addNewAddressButton.addEventListener('click', () => {
        this.openAddressForm();
      });
    }

    if (updateAddressButtons) {
      updateAddressButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          const customerAddress = button.closest('.customer-address');
          const addressData = customerAddress?.getAttribute('data-address') ?? '';
          this.openAddressForm(true);
          this.addressData = JSON.parse(addressData);
          await this.fillAddressForm(this.addressData);
        });
      });
    }

    if (closeFormButton) {
      closeFormButton.addEventListener('click', () => {
        this.closeAddressForm();
      });
    }

    if (removeAddressButtons) {
      removeAddressButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const addressId = button.getAttribute('data-address-id');
          this.openNotifyPopup('confirm-remove', addressId);
        });
      });
    }

    const closeNotifyPopupButtons = [];

    if (this.confirmRemoveAddressPopup) {
      const notRemoveAddress = this.confirmRemoveAddressPopup.querySelector('button.not-remove');
      const confirmRemoveAddress = this.confirmRemoveAddressPopup.querySelector('button.remove');
      const closeCfRemoveAddress = this.confirmRemoveAddressPopup.querySelector('.close-button');
      const backCfRemoveAddress = this.confirmRemoveAddressPopup.querySelector('button.back-button');

      notRemoveAddress && closeNotifyPopupButtons.push(notRemoveAddress);
      closeCfRemoveAddress && closeNotifyPopupButtons.push(closeCfRemoveAddress);
      backCfRemoveAddress && closeNotifyPopupButtons.push(backCfRemoveAddress);
      confirmRemoveAddress &&
        confirmRemoveAddress.addEventListener('click', async () => {
          const addressId = this.removeAddressIdInput?.value;
          if (!addressId || addressId == this.defaultAddressId) {
            location.reload();
          }

          await this.removeAddress(addressId);
        });
    }

    if (this.invalidAddressNotify) {
      const closeInvalidAddressNotifyButton = this.invalidAddressNotify.querySelector('.close-button');
      const backInvalidAddressNotifyButton = this.invalidAddressNotify.querySelector('button.back-button');
      closeInvalidAddressNotifyButton && closeNotifyPopupButtons.push(closeInvalidAddressNotifyButton);
      backInvalidAddressNotifyButton && closeNotifyPopupButtons.push(backInvalidAddressNotifyButton);
    }

    if (closeNotifyPopupButtons && closeNotifyPopupButtons.length) {
      closeNotifyPopupButtons.forEach((button) => {
        button.addEventListener('click', () => {
          this.closeNotifyPopup();
        });
      });
    }

    if (setDefaultButtons) {
      setDefaultButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          const customerAddress = button.closest('.customer-address');
          const addressData = customerAddress?.getAttribute('data-address') ?? '';
          await this.setDefaultAddress(JSON.parse(addressData));
        });
      });
    }

    if (backButton) {
      backButton.addEventListener('click', () => {
        this.closeAddressForm();
      });
    }

    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        await this.saveAddress();
      });
    }

    if (this.postalField && this.postalFieldRequired) {
      this.postalField.addEventListener('change', async (event) => {
        const postalRequiredField = this.postalFieldRequired;
        postalRequiredField.classList = 'require-field';
        this.appendAddressDefaultSelect();
        this.hideAddressSelectField();
        this.currentPostalCode = String(event.target.value).trim();

        if (!event.target.value) {
          return;
        }

        if (!this.postalCodeThais.includes(this.currentPostalCode)) {
          await this.getAddressByPostalCodes([this.currentPostalCode], true);
        } else if (
          this.postalCodeThais.includes(this.currentPostalCode) &&
          !this.validPostalCodeThais.includes(this.currentPostalCode)
        ) {
          postalRequiredField.classList = 'require-field error-invalid';
          this.appendAddressDefaultSelect();
          this.hideAddressSelectField();
        }

        this.appendPostalCodeSelectData();
      });
    }

    this.districtSelect.addEventListener('change', (event) => {
      this.districtSelected = String(event.target.value).trim();
      this.getSelectAddressData(this.currentPostalAddressData, false, true);
      this.appendSelectAddressOptions();
    });

    this.provinceSelect.addEventListener('change', (event) => {
      this.provinceSelected = String(event.target.value).trim();
      this.getSelectAddressData(this.currentPostalAddressData, true);
      this.appendSelectAddressOptions();
    });

    this.subDistrictSelect.addEventListener('change', (event) => {
      if (!String(event.target.value).trim()) {
        this.getSelectAddressData(this.currentPostalAddressData);
        this.appendSelectAddressOptions();
        return;
      }

      this.subDistrictSelected = String(event.target.value).trim();
      this.getSelectAddressData(this.currentPostalAddressData, false, false, true);
      this.appendSelectAddressOptions();
    });

    this.removeFieldErrorEvent();
  }

  getAddressFormInput() {
    this.addressIdField = this.addressForm.querySelector('input[name="address-id"]');
    const defaultAddressInput = this.addressForm.querySelector('input[name="default-address-id"]');

    this.defaultAddressId = defaultAddressInput?.value;
    this.firstName = this.addressForm.querySelector('input[name="first-name"]');
    this.lastName = this.addressForm.querySelector('input[name="last-name"]');
    this.addressField = this.addressForm.querySelector('input[name="address1"]');
    this.postalField = this.addressForm.querySelector('input[name="postal"]');
    this.postalFieldRequired = this.postalField ? this.postalField.closest('.require-field') : null;
    this.subDistrictSelect = this.addressForm.querySelector('select[name="address2"]');
    this.subDistrictDefault = this.subDistrictSelect ? this.subDistrictSelect.innerHTML : '';
    this.districtSelect = this.addressForm.querySelector('select[name="city"]');
    this.districtDefault = this.districtSelect ? this.districtSelect.innerHTML : '';
    this.provinceSelect = this.addressForm.querySelector('select[name="province"]');
    this.provinceDefault = this.provinceSelect ? this.provinceSelect.innerHTML : '';
    this.phoneField = this.addressForm.querySelector('input[name="phone-number"]');
    this.companyField = this.addressForm.querySelector('input[name="company"]');
    this.removeAddressIdInput = this.confirmRemoveAddressPopup
      ? this.confirmRemoveAddressPopup.querySelector('input[name="remove-address-id"]')
      : null;
    this.requireFields = [
      this.firstName,
      this.lastName,
      this.addressField,
      this.subDistrictSelect,
      this.districtSelect,
      this.provinceSelect,
      this.phoneField,
    ];

    if (
      !this.firstName ||
      !this.lastName ||
      !this.addressField ||
      !this.postalFieldRequired ||
      !this.subDistrictSelect ||
      !this.districtSelect ||
      !this.provinceSelect ||
      !this.phoneField
    ) {
      location.reload();
    }
  }

  loadPhoneLib() {
    const script = document.createElement('script');
    script.src = `${this.phoneLibSrc}/js/intlTelInput.min.js`;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      this.initPhoneNumberField();
    };

    script.onerror = () => {
      console.error('Failed to load phone number library');
    };
  }

  initPhoneNumberField() {
    this.phoneInput = window.intlTelInput(this.phoneField, {
      initialCountry: this.thaiCountryCode,
      dropdownContainer: window.innerWidth < 768 ? document.body : null,
      loadUtils: () => import(`${this.phoneLibSrc}/js/utils.js`),
    });

    this.phoneField.addEventListener('change', () => {
      this.validatePhoneNumber();
      this.phoneField.value = this.phoneInput.getNumber();
    });

    this.phoneField.addEventListener('countrychange', () => {
      this.validatePhoneNumber();
      this.phoneField.value = this.phoneInput.getNumber();
    });
  }

  validatePhoneNumber() {
    const phoneRequired = this.phoneField.closest('.require-field');

    if (!phoneRequired) {
      return false;
    }

    phoneRequired.classList = 'require-field';
    if (
      this.phoneInput.getSelectedCountryData()?.iso2 == this.thaiCountryCode &&
      !this.phoneInput.isValidNumberPrecise()
    ) {
      phoneRequired.classList = 'require-field error-invalid';
      return false;
    }

    return true;
  }

  initSelectField() {
    const selects = this.addressForm.querySelectorAll('select');

    if (!selects || !selects.length) {
      return;
    }

    selects.forEach((select) => {
      select.addEventListener('change', (event) => {
        if (event.target.value) {
          select.classList = 'filled';
        } else {
          select.classList = '';
        }
      });
    });
  }

  async fillAddressForm(addressData) {
    if (!addressData) {
      return;
    }

    this.addressIdField.value = addressData.id ?? '';
    this.firstName.value = addressData.firstName ?? '';
    this.lastName.value = addressData.lastName ?? '';
    this.addressField.value = addressData.address1 ?? '';

    if (this.phoneInput) {
      this.phoneInput.setNumber(addressData.phoneNumber ?? '');
    }

    if (addressData.postal) {
      const addressPostal = addressData.postal.trim();
      this.postalField.value = this.currentPostalCode = addressPostal;
      if (!this.postalCodeThais.includes(addressPostal)) {
        await this.getAddressByPostalCodes([String(addressPostal)]);
      }
      this.appendPostalCodeSelectData(addressData);
    }
  }

  async getAddressByPostalCodes(postalCodes, postalCodeChange = false) {
    if (!postalCodes || !postalCodes.length) {
      return;
    }

    let currentAddressThais = JSON.parse(localStorage.getItem('addressThais'));
    if (!currentAddressThais || !currentAddressThais.postalCodes) {
      await this.getAddressThaiVer();
      currentAddressThais = { postalCodes: [], addressThais: [] };
    }
    const uniquePostalCode = postalCodes.filter((value, index, self) => self.indexOf(value) === index);
    this.loading = true;
    const response = await fetch(`${this.appProxyUrl}/api/sso/getAddressByPostalCodes`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        postalCodes: uniquePostalCode,
      }),
    }).then((response) => response.json());

    if (!response.success) {
      console.error(`Response status: ${response.status}`);
      return null;
    }

    const result = JSON.parse(response.data);
    if (result.length > 0) {
      uniquePostalCode.forEach((postalCode) => {
        this.postalCodeThais?.push(postalCode);
        const resultAddress = result.filter((address) => address.zipcode == postalCode);
        const addressThais = {
          postalCode: postalCode,
          value: resultAddress.map((item) => {
            return {
              subdistrict: {
                en: item.subdistrict.en.replace(/[\r\n]+/g, '').trim(),
                th: item.subdistrict.th.replace(/[\r\n]+/g, '').trim(),
              },
              district: {
                en: item.district.en.replace(/[\r\n]+/g, '').trim(),
                th: item.district.th.replace(/[\r\n]+/g, '').trim(),
              },
              province: {
                en: item.province.en.replace(/[\r\n]+/g, '').trim(),
                th: item.province.th.replace(/[\r\n]+/g, '').trim(),
              },
            };
          }),
        };

        if (resultAddress && resultAddress.length) {
          this.validPostalCodeThais?.push(postalCode);
          currentAddressThais.postalCodes.push(postalCode);
          currentAddressThais.addressThais.push(addressThais);
        }
        this.addressThais.push(addressThais);
      });
    } else if (postalCodeChange) {
      this.postalFieldRequired.classList = 'require-field error-invalid';
      this.appendAddressDefaultSelect();
      this.hideAddressSelectField();
    }

    localStorage.setItem('addressThais', JSON.stringify(currentAddressThais));
    this.loading = false;
  }

  appendPostalCodeSelectData(addressData) {
    if (!this.postalCodeThais.includes(this.currentPostalCode)) {
      return;
    }

    const postalAddressData = this.addressThais.filter((address) => {
      return address.postalCode == this.currentPostalCode;
    });
    this.subDistrictSelected = addressData?.address2 ? addressData.address2.trim() : '';
    this.districtSelected = addressData?.city ?? '';
    this.provinceSelected = addressData?.province ? addressData.province.trim() : '';

    if (postalAddressData.length > 0 && postalAddressData[0]?.value) {
      this.currentPostalAddressData = postalAddressData[0]?.value;
      this.getSelectAddressData(this.currentPostalAddressData);
      this.appendSelectAddressOptions();
    } else {
      this.appendAddressDefaultSelect();
      this.hideAddressSelectField();
    }
  }
  getSelectAddressData(postalAddressData, provinceChange, districtChange, subDistrictChange) {
    this.provinceSelectData = [];
    this.districtSelectData = [];
    this.subDistrictSelectData = [];

    // check address valid
    const isMatchAddress = this.isMatchAddress(postalAddressData);

    if (provinceChange) {
      this.districtSelected = '';
      this.subDistrictSelected = '';
    }

    if (districtChange) {
      this.subDistrictSelected = '';
    }

    if (subDistrictChange && !isMatchAddress) {
      this.subDistrictSelected = '';
      this.districtSelected = '';
    }

    const isPreSelect = !this.provinceSelected && !this.districtSelected && !this.subDistrictSelected;

    // fill data address match province > district > subdistrict
    // get sub district, district case-insensitive
    postalAddressData.forEach((address) => {
      if (this.language == 'en') {
        // translate
        if (
          this.provinceSelected &&
          (this.provinceSelected == address.province.en || this.provinceSelected == address.province.th)
        ) {
          this.provinceSelected = address.province.en;
        }

        if (
          this.districtSelected &&
          (this.districtSelected.toLowerCase() == address.district.en.toLowerCase() ||
            this.districtSelected.toLowerCase() == address.district.th.toLowerCase())
        ) {
          this.districtSelected = address.district.en;
        }
        if (
          this.subDistrictSelected &&
          (this.subDistrictSelected.toLowerCase() == address.subdistrict.en.toLowerCase() ||
            this.subDistrictSelected.toLowerCase() == address.subdistrict.th.toLowerCase())
        ) {
          this.subDistrictSelected = address.subdistrict.en;
        }

        // pre select
        if (!this.provinceSelected) {
          this.provinceSelected = address.province.en;
        }

        if (
          !this.districtSelected &&
          (this.provinceSelected == address.province.en || this.provinceSelected == address.province.th)
        ) {
          this.districtSelected = address.district.en;
        }
        if (
          !this.subDistrictSelected &&
          (this.districtSelected == address.district.en || this.districtSelected == address.district.th)
        ) {
          this.subDistrictSelected = address.subdistrict.en;
        }

        // select options
        !this.provinceSelectData.includes(address.province.en) && this.provinceSelectData.push(address.province.en);

        // invalid addresses and unchanged addresses will be filled
        (this.provinceSelected == address.province.en ||
          this.provinceSelected == address.province.th ||
          (!isMatchAddress && !provinceChange && !districtChange && !isPreSelect)) &&
          !this.districtSelectData.includes(address.district.en) &&
          this.districtSelectData.push(address.district.en);

        (this.districtSelected == address.district.en ||
          this.districtSelected == address.district.th ||
          (!isMatchAddress && !provinceChange && !districtChange && !isPreSelect)) &&
          !this.subDistrictSelectData.includes(address.subdistrict.en) &&
          this.subDistrictSelectData.push(address.subdistrict.en);
      } else {
        // translate
        if (
          this.provinceSelected &&
          (this.provinceSelected == address.province.en || this.provinceSelected == address.province.th)
        ) {
          this.provinceSelected = address.province.th;
        }

        if (
          this.districtSelected &&
          (this.districtSelected.toLowerCase() == address.district.en.toLowerCase() ||
            this.districtSelected.toLowerCase() == address.district.th.toLowerCase())
        ) {
          this.districtSelected = address.district.th;
        }
        if (
          this.subDistrictSelected &&
          (this.subDistrictSelected.toLowerCase() == address.subdistrict.en.toLowerCase() ||
            this.subDistrictSelected.toLowerCase() == address.subdistrict.th.toLowerCase())
        ) {
          this.subDistrictSelected = address.subdistrict.th;
        }

        // pre select
        if (!this.provinceSelected) {
          this.provinceSelected = address.province.th;
        }

        if (
          !this.districtSelected &&
          (this.provinceSelected == address.province.en || this.provinceSelected == address.province.th)
        ) {
          this.districtSelected = address.district.th;
        }
        if (
          !this.subDistrictSelected &&
          (this.districtSelected == address.district.en || this.districtSelected == address.district.th)
        ) {
          this.subDistrictSelected = address.subdistrict.th;
        }
        // select options
        !this.provinceSelectData.includes(address.province.th) && this.provinceSelectData.push(address.province.th);

        (this.provinceSelected == address.province.en ||
          this.provinceSelected == address.province.th ||
          (!isMatchAddress && !provinceChange && !districtChange && !isPreSelect)) &&
          !this.districtSelectData.includes(address.district.th) &&
          this.districtSelectData.push(address.district.th);

        (this.districtSelected == address.district.en ||
          this.districtSelected == address.district.th ||
          (!isMatchAddress && !provinceChange && !districtChange && !isPreSelect)) &&
          !this.subDistrictSelectData.includes(address.subdistrict.th) &&
          this.subDistrictSelectData.push(address.subdistrict.th);
      }
    });

    if (districtChange && !this.isMatchAddress(postalAddressData)) {
      // fill match province when subdistrict & district correct
      this.findMatchProvince(postalAddressData);
    }
  }

  findMatchProvince(postalAddressData) {
    postalAddressData.forEach((address) => {
      if (this.language == 'en') {
        if (
          (this.subDistrictSelected == address.subdistrict.en || this.subDistrictSelected == address.subdistrict.th) &&
          (this.districtSelected == address.district.en || this.districtSelected == address.district.th)
        ) {
          this.provinceSelected = address.province.en;
        }
      } else {
        if (
          (this.subDistrictSelected == address.subdistrict.en || this.subDistrictSelected == address.subdistrict.th) &&
          (this.districtSelected == address.district.en || this.districtSelected == address.district.th)
        ) {
          this.provinceSelected = address.province.th;
        }
      }
    });
  }

  appendSelectAddressOptions() {
    let subDistrictOptionHtml = '';
    let districtOptionHtml = '';
    let provinceOptionHtml = '';

    if (!this.subDistrictSelectData.length || !this.districtSelectData.length || !this.provinceSelectData.length) {
      return;
    }

    if (this.subDistrictSelected) {
      this.subDistrictSelect.classList = 'filled';
    }

    if (this.districtSelected) {
      this.districtSelect.classList = 'filled';
    }

    if (this.provinceSelected) {
      this.provinceSelect.classList = 'filled';
    }

    if (this.subDistrictSelected && this.districtSelected && this.provinceSelected) {
      this.removeAddressFieldError();
    }

    this.subDistrictSelectData.forEach((subDistrict) => {
      subDistrictOptionHtml += `<option ${
        this.subDistrictSelected == subDistrict ? 'selected' : ''
      } value="${subDistrict}">${subDistrict}</option>`;
    });

    this.districtSelectData.forEach((district) => {
      districtOptionHtml += `<option ${
        this.districtSelected == district ? 'selected' : ''
      } value="${district}">${district}</option>`;
    });

    this.provinceSelectData.forEach((province) => {
      provinceOptionHtml += `<option ${
        this.provinceSelected == province ? 'selected' : ''
      } value="${province}">${province}</option>`;
    });

    if (!this.subDistrictSelectData.includes(this.subDistrictSelected)) {
      subDistrictOptionHtml =
        this.subDistrictDefault +
        `<option selected value="${this.subDistrictSelected}">${this.subDistrictSelected}</option>` +
        subDistrictOptionHtml;
    } else {
      subDistrictOptionHtml = this.subDistrictDefault + subDistrictOptionHtml;
    }

    if (!this.districtSelectData.includes(this.districtSelected)) {
      districtOptionHtml =
        this.districtDefault +
        `<option selected value="${this.districtSelected}">${this.districtSelected}</option>` +
        districtOptionHtml;
    } else {
      districtOptionHtml = this.districtDefault + districtOptionHtml;
    }

    if (!this.provinceSelectData.includes(this.provinceSelected)) {
      provinceOptionHtml =
        this.provinceDefault +
        `<option selected value="${this.provinceSelected}">${this.provinceSelected}</option>` +
        provinceOptionHtml;
    } else {
      provinceOptionHtml = this.provinceDefault + provinceOptionHtml;
    }

    this.appendAddressSelectField(subDistrictOptionHtml, districtOptionHtml, provinceOptionHtml);
    this.showAddressSelectField();
  }

  isMatchAddress(postalAddressData) {
    return postalAddressData.find((address) => {
      return (
        (address.province.en.toLowerCase() == this.provinceSelected.toLowerCase() ||
          address.province.th.toLowerCase() == this.provinceSelected.toLowerCase()) &&
        (address.district.en.toLowerCase() == this.districtSelected.toLowerCase() ||
          address.district.th.toLowerCase() == this.districtSelected.toLowerCase()) &&
        (address.subdistrict.en.toLowerCase() == this.subDistrictSelected.toLowerCase() ||
          address.subdistrict.th.toLowerCase() == this.subDistrictSelected.toLowerCase())
      );
    });
  }

  showAddressSelectField() {
    this.subDistrictSelect.disabled = false;
    this.districtSelect.disabled = false;
    this.provinceSelect.disabled = false;
  }

  hideAddressSelectField() {
    this.subDistrictSelect.disabled = true;
    this.districtSelect.disabled = true;
    this.provinceSelect.disabled = true;
  }

  appendAddressSelectField(subDistrictOptionHtml, districtOptionHtml, provinceOptionHtml) {
    this.subDistrictSelect.innerHTML = subDistrictOptionHtml;
    this.districtSelect.innerHTML = districtOptionHtml;
    this.provinceSelect.innerHTML = provinceOptionHtml;
  }

  appendAddressDefaultSelect() {
    this.subDistrictSelect.value = '';
    this.districtSelect.value = '';
    this.provinceSelect.value = '';
    this.subDistrictSelect.innerHTML = this.subDistrictDefault;
    this.districtSelect.innerHTML = this.districtDefault;
    this.provinceSelect.innerHTML = this.provinceDefault;
    this.subDistrictSelect.classList = this.districtSelect.classList = this.provinceSelect.classList = '';
  }

  openAddressForm(isUpdate) {
    if (!this.addressForm) {
      location.reload();
    }

    const formTitle = this.addressForm.querySelector('.form-address-title');

    if (isUpdate && formTitle) {
      formTitle.classList.add('update');
    }

    if (isUpdate) {
      this.isUpdate = true;
    } else {
      this.isUpdate = false;
    }
    document.body.style.overflow = 'hidden';
    this.addressForm.classList.add('show');
  }

  closeAddressForm() {
    if (!this.addressForm) {
      location.reload();
    }

    const formTitle = this.addressForm.querySelector('.form-address-title');
    document.body.style.overflow = 'visible';
    this.addressForm.classList = 'address-form-wrapper';
    formTitle.classList = 'form-address-title';
    this.phoneInput.setCountry(this.thaiCountryCode);
    this.currentPostalAddressData = [];
    this.resetAddressForm();
    this.removeFieldError();
  }

  resetAddressForm() {
    const formInput = this.addressForm.querySelectorAll('input');

    if (formInput.length) {
      formInput.forEach((input) => {
        input.value = '';
      });
    } else {
      location.reload();
    }

    this.hideAddressSelectField();
    this.appendAddressDefaultSelect();
  }

  openNotifyPopup(type, removeAddressId) {
    if (!this.notifyPopupWrapper || !this.confirmRemoveAddressPopup || !this.removeAddressIdInput) {
      location.reload();
    }
    if (type == 'confirm-remove') {
      if (removeAddressId == this.defaultAddressId) {
        this.confirmRemoveAddressPopup.classList.add('not-allowed');
      } else {
        this.removeAddressIdInput.value = removeAddressId;
        this.confirmRemoveAddressPopup.classList.add('allowed');
      }
    }

    document.body.style.overflow = 'hidden';
    this.notifyPopupWrapper.classList.add(type);
  }

  closeNotifyPopup() {
    if (!this.notifyPopupWrapper || !this.confirmRemoveAddressPopup || !this.removeAddressIdInput) {
      location.reload();
    }
    document.body.style.overflow = 'visible';
    this.notifyPopupWrapper.classList = 'notify-popup-wrapper';
    this.confirmRemoveAddressPopup.classList.remove('allowed');
    this.confirmRemoveAddressPopup.classList.remove('not-allowed');
    this.removeAddressIdInput.value = '';
  }

  async saveAddress() {
    if (!this.validateAddress()) {
      return;
    }

    const addressEn = this.getAddressEn(
      this.postalField.value.trim(),
      this.subDistrictSelect.value.trim(),
      this.districtSelect.value.trim(),
      this.provinceSelect.value.trim()
    );

    if (!addressEn) {
      const formTitle = this.addressForm.querySelector('.form-address-title');
      formTitle.classList.add('invalid-address');
      return;
    }

    const formData = new URLSearchParams();
    formData.append('form_type', 'customer_address');
    formData.append('utf8', '✓');
    formData.append('address[first_name]', this.firstName.value);
    formData.append('address[last_name]', this.lastName.value);
    formData.append('address[company]', this.companyField?.value);
    formData.append('address[address1]', this.addressField.value);
    formData.append('address[address2]', addressEn.subDistrict);
    formData.append('address[city]', addressEn.district);
    formData.append('address[country]', 'Thailand');
    formData.append('address[province]', addressEn.province);
    formData.append('address[zip]', this.postalField.value ? this.postalField.value.trim() : '');
    formData.append('address[phone]', this.phoneInput.getNumber());

    const url = `account/addresses/${this.isUpdate && this.addressIdField?.value ? this.addressIdField.value : ''}`;
    if (this.isUpdate && this.addressIdField?.value) {
      formData.append('_method', 'put');
    }

    await this.postForm(url, formData);
  }

  validateAddress() {
    let check = true;
    let phoneCheck = this.validatePhoneNumber();

    const postalAddressData = this.addressThais.filter((address) => {
      return address.postalCode == this.currentPostalCode;
    });

    if (this.requireFields && this.requireFields.length) {
      this.requireFields.forEach((field) => {
        if (!field.value || !String(field.value).trim()) {
          field.closest('.require-field').classList = 'require-field error-required';
          check = false;
        }
      });
    }

    if (!this.postalField.value) {
      this.postalFieldRequired.classList = 'require-field error-required';
      check = false;
    } else if (
      (!postalAddressData || !postalAddressData[0].value || !postalAddressData[0].value.length) &&
      this.postalField.value
    ) {
      this.postalFieldRequired.classList = 'require-field error-invalid';
      check = false;
    }

    return check && phoneCheck;
  }

  removeFieldErrorEvent() {
    this.requireFields.forEach((field) => {
      field.addEventListener('change', (event) => {
        if (event.target.value) {
          field.closest('.require-field').classList = 'require-field';
        }
      });
    });
  }

  removeFieldError() {
    this.requireFields.forEach((field) => {
      field.closest('.require-field').classList = 'require-field';
    });

    this.postalFieldRequired.classList = 'require-field';
  }

  removeAddressFieldError() {
    const addressField = [this.subDistrictSelect, this.districtSelect, this.provinceSelect];
    addressField.forEach((field) => {
      field.closest('.require-field').classList = 'require-field';
    });
  }

  async removeAddress(addressId) {
    const formData = new URLSearchParams();
    const url = `/account/addresses/${addressId}`;

    formData.append('_method', 'delete');
    await this.postForm(url, formData);
  }

  async setDefaultAddress(address) {
    if (
      !address ||
      !address.lastName ||
      !address.address1 ||
      !address.address2 ||
      !address.city ||
      !address.province ||
      !address.postal ||
      !address.phoneNumber
    ) {
      this.openNotifyPopup('invalid-address');
      return;
    }

    const addressEn = this.getAddressEn(
      address.postal.trim(),
      address.address2.trim(),
      address.city.trim(),
      address.province.trim()
    );

    if (!addressEn) {
      this.openNotifyPopup('invalid-address');
      return;
    }

    const formData = new URLSearchParams();
    const url = `/account/addresses/${address.id}`;

    formData.append('form_type', 'customer_address');
    formData.append('utf8', '✓');
    formData.append('address[first_name]', address.firstName ?? '');
    formData.append('address[last_name]', address.lastName);
    formData.append('address[company]', address.company ?? '');
    formData.append('address[address1]', address.address1);
    formData.append('address[address2]', addressEn.subDistrict);
    formData.append('address[city]', addressEn.district);
    formData.append('address[country]', 'Thailand');
    formData.append('address[province]', addressEn.province);
    formData.append('address[zip]', address.postal ? address.postal.trim() : '');
    formData.append('address[phone]', address.phoneNumber);
    formData.append('address[default]', 1);
    formData.append('_method', 'put');

    await this.postForm(url, formData);
  }

  async postForm(url, formData) {
    if (this.loading) {
      return;
    }

    this.loading = true;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.loading = false;
      })
      .catch((error) => {
        console.error('Error:', error);
      });

    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has('page')) {
      currentUrl.searchParams.delete('page');
      window.history.pushState({}, '', currentUrl);
    }
    location.reload();
  }

  getAddressEn(postalCode, subDistrict, district, province) {
    if (!postalCode || !this.addressThais || !this.addressThais.length) {
      return null;
    }

    const postalCodeAddress = this.addressThais.find((addressThai) => addressThai.postalCode == postalCode);

    if (!postalCodeAddress || !postalCodeAddress.value || !postalCodeAddress.value.length) {
      return null;
    }

    const addressEn = postalCodeAddress.value.find(
      (address) =>
        (address.subdistrict.en == subDistrict || address.subdistrict.th == subDistrict) &&
        (address.district.en == district || address.district.th == district) &&
        (address.province.en == province || address.province.th == province)
    );

    if (!addressEn) {
      return null;
    }

    return {
      subDistrict: addressEn.subdistrict.en,
      district: addressEn.district.en,
      province: addressEn.province.en,
    };
  }
}

customElements.define('my-address', MyAddress);
