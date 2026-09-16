import { baseLayerLuminance, StandardLuminance } from 'https://unpkg.com/@fluentui/web-components';

const LISTING_URL = "{{ listingInfo.Url }}";

const PACKAGES = {
{{~ for package in packages ~}}
  [`{{ package.Name }}`]: {
    name: `{{ package.Name }}`,
    displayName: `{{ package.DisplayName | html.escape }}`,
    description: `{{ package.Description | html.escape }}`,
    version: `{{ package.Version }}`,
    author: {
      name: `{{ package.Author.Name | html.escape }}`,
      url: `{{ package.Author.Url | html.escape }}`,
    },
    dependencies: {
      {{~ for dependency in package.Dependencies ~}}
        [`{{ dependency.Name }}`]: `{{ dependency.Version }}`,
      {{~ end ~}}
    },
    keywords: [
      {{~ for keyword in package.Keywords ~}}
        `{{ keyword | html.escape }}`,
      {{~ end ~}}
    ],
    license: `{{ package.License | html.escape }}`,
    licensesUrl: `{{ package.LicensesUrl | html.escape }}`,
  },
{{~ end ~}}
};

const setTheme = () => {
  const isDarkTheme = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (isDarkTheme()) {
    baseLayerLuminance.setValueFor(document.documentElement, StandardLuminance.DarkMode);
  } else {
    baseLayerLuminance.setValueFor(document.documentElement, StandardLuminance.LightMode);
  }
};

const copyToClipboard = (inputElement, buttonElement) => {
  if (!inputElement) return;
  inputElement.select();
  navigator.clipboard.writeText(inputElement.value);
  if (buttonElement) {
    buttonElement.appearance = 'accent';
    setTimeout(() => {
      buttonElement.appearance = 'neutral';
    }, 1000);
  }
};

(() => {
  setTheme();

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    setTheme();
  });

  const packageGrid = document.getElementById('packageGrid');

  // Search input filtering for package rows
  const searchInput = document.getElementById('searchInput');
  if (searchInput && packageGrid) {
    searchInput.addEventListener('input', (event) => {
      const value = (event.target?.value || '').trim().toLowerCase();
      const items = packageGrid.querySelectorAll('fluent-data-grid-row:not([row-type="header"])');
      items.forEach(item => {
        if (value === '') {
          item.style.display = '';
          return;
        }
        const packageName = item.dataset?.packageName?.toLowerCase() || '';
        const packageId = item.dataset?.packageId?.toLowerCase() || '';
        if (packageName.includes(value) || packageId.includes(value)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  // Help dialog handlers
  const urlBarHelpButton = document.getElementById('urlBarHelp');
  const addListingToVccHelp = document.getElementById('addListingToVccHelp');
  const addListingToVccHelpClose = document.getElementById('addListingToVccHelpClose');

  if (urlBarHelpButton && addListingToVccHelp) {
    urlBarHelpButton.addEventListener('click', () => {
      addListingToVccHelp.hidden = false;
    });
  }

  if (addListingToVccHelpClose && addListingToVccHelp) {
    addListingToVccHelpClose.addEventListener('click', () => {
      addListingToVccHelp.hidden = true;
    });
  }

  // Copy buttons for Listing URLs
  const vccListingInfoUrlFieldCopy = document.getElementById('vccListingInfoUrlFieldCopy');
  const vccListingInfoUrlField = document.getElementById('vccListingInfoUrlField');
  if (vccListingInfoUrlFieldCopy && vccListingInfoUrlField) {
    vccListingInfoUrlFieldCopy.addEventListener('click', () => {
      copyToClipboard(vccListingInfoUrlField, vccListingInfoUrlFieldCopy);
    });
  }

  const vccUrlFieldCopy = document.getElementById('vccUrlFieldCopy');
  const vccUrlField = document.getElementById('vccUrlField');
  if (vccUrlFieldCopy && vccUrlField) {
    vccUrlFieldCopy.addEventListener('click', () => {
      copyToClipboard(vccUrlField, vccUrlFieldCopy);
    });
  }

  const packageInfoVccUrlFieldCopy = document.getElementById('packageInfoVccUrlFieldCopy');
  const packageInfoVccUrlField = document.getElementById('packageInfoVccUrlField');
  if (packageInfoVccUrlFieldCopy && packageInfoVccUrlField) {
    packageInfoVccUrlFieldCopy.addEventListener('click', () => {
      copyToClipboard(packageInfoVccUrlField, packageInfoVccUrlFieldCopy);
    });
  }

  // VCC deep link buttons
  const vccAddRepoButton = document.getElementById('vccAddRepoButton');
  if (vccAddRepoButton) {
    vccAddRepoButton.addEventListener('click', () => {
      window.location.assign(`vcc://vpm/addRepo?url=${encodeURIComponent(LISTING_URL)}`);
    });
  }

  const rowAddToVccButtons = document.querySelectorAll('.rowAddToVccButton');
  rowAddToVccButtons.forEach((button) => {
    button.addEventListener('click', () => {
      window.location.assign(`vcc://vpm/addRepo?url=${encodeURIComponent(LISTING_URL)}`);
    });
  });

  // Row context menu for download
  const rowMoreMenu = document.getElementById('rowMoreMenu');
  let currentDownloadUrl = null;

  const hideRowMoreMenu = (e) => {
    if (rowMoreMenu && !rowMoreMenu.contains(e.target)) {
      document.removeEventListener('click', hideRowMoreMenu);
      rowMoreMenu.hidden = true;
    }
  };

  const rowMenuButtons = document.querySelectorAll('.rowMenuButton');
  rowMenuButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetButton = e.currentTarget || e.target.closest('.rowMenuButton');
      currentDownloadUrl = targetButton?.dataset?.packageUrl;

      if (rowMoreMenu) {
        const rect = targetButton.getBoundingClientRect();
        rowMoreMenu.style.top = `${rect.bottom + window.scrollY}px`;
        rowMoreMenu.style.left = `${rect.right + window.scrollX - 140}px`;
        rowMoreMenu.hidden = false;

        setTimeout(() => {
          document.addEventListener('click', hideRowMoreMenu);
        }, 1);
      }
    });
  });

  const rowMoreMenuDownload = document.getElementById('rowMoreMenuDownload');
  if (rowMoreMenuDownload) {
    rowMoreMenuDownload.addEventListener('click', () => {
      if (currentDownloadUrl) {
        window.open(currentDownloadUrl, '_blank');
      }
      if (rowMoreMenu) {
        rowMoreMenu.hidden = true;
      }
      document.removeEventListener('click', hideRowMoreMenu);
    });
  }

  // Package Info Modal setup
  const packageInfoModal = document.getElementById('packageInfoModal');
  const packageInfoModalClose = document.getElementById('packageInfoModalClose');

  if (packageInfoModalClose && packageInfoModal) {
    packageInfoModalClose.addEventListener('click', () => {
      packageInfoModal.hidden = true;
    });
  }

  const setupModalStyles = () => {
    if (!packageInfoModal) return;
    const modalControl = packageInfoModal.shadowRoot?.querySelector('.control');
    if (modalControl) {
      modalControl.style.maxHeight = '90%';
      modalControl.style.transition = 'height 0.2s ease-in-out';
      modalControl.style.overflowY = 'auto';
    }
  };

  if (customElements?.whenDefined) {
    customElements.whenDefined('fluent-dialog').then(setupModalStyles).catch(() => {});
  } else {
    setupModalStyles();
  }

  const packageInfoName = document.getElementById('packageInfoName');
  const packageInfoId = document.getElementById('packageInfoId');
  const packageInfoVersion = document.getElementById('packageInfoVersion');
  const packageInfoDescription = document.getElementById('packageInfoDescription');
  const packageInfoAuthor = document.getElementById('packageInfoAuthor');
  const packageInfoDependencies = document.getElementById('packageInfoDependencies');
  const packageInfoKeywords = document.getElementById('packageInfoKeywords');
  const packageInfoLicense = document.getElementById('packageInfoLicense');

  const rowPackageInfoButtons = document.querySelectorAll('.rowPackageInfoButton');
  rowPackageInfoButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      const targetButton = e.currentTarget || e.target.closest('.rowPackageInfoButton');
      const packageId = targetButton?.dataset?.packageId;
      const packageInfo = PACKAGES?.[packageId];
      if (!packageInfo) {
        console.error(`Did not find package ${packageId}. Packages available:`, PACKAGES);
        return;
      }

      if (packageInfoName) packageInfoName.textContent = packageInfo.displayName;
      if (packageInfoId) packageInfoId.textContent = packageId;
      if (packageInfoVersion) packageInfoVersion.textContent = `v${packageInfo.version}`;
      if (packageInfoDescription) packageInfoDescription.textContent = packageInfo.description;
      if (packageInfoAuthor) {
        packageInfoAuthor.textContent = packageInfo.author?.name || '';
        packageInfoAuthor.href = packageInfo.author?.url || '#';
      }

      if (packageInfoKeywords) {
        if ((packageInfo.keywords?.length ?? 0) === 0) {
          packageInfoKeywords.parentElement.classList.add('hidden');
        } else {
          packageInfoKeywords.parentElement.classList.remove('hidden');
          packageInfoKeywords.innerHTML = '';
          packageInfo.keywords.forEach(keyword => {
            const keywordDiv = document.createElement('div');
            keywordDiv.classList.add('me-2', 'mb-2', 'badge');
            keywordDiv.textContent = keyword;
            packageInfoKeywords.appendChild(keywordDiv);
          });
        }
      }

      if (packageInfoLicense) {
        if (!packageInfo.license?.length && !packageInfo.licensesUrl?.length) {
          packageInfoLicense.parentElement.classList.add('hidden');
        } else {
          packageInfoLicense.parentElement.classList.remove('hidden');
          packageInfoLicense.textContent = packageInfo.license || 'See License';
          packageInfoLicense.href = packageInfo.licensesUrl || '#';
        }
      }

      if (packageInfoDependencies) {
        packageInfoDependencies.innerHTML = '';
        Object.entries(packageInfo.dependencies || {}).forEach(([name, version]) => {
          const depRow = document.createElement('li');
          depRow.classList.add('mb-2');
          depRow.textContent = `${name} @ v${version}`;
          packageInfoDependencies.appendChild(depRow);
        });
      }

      if (packageInfoModal) {
        setupModalStyles();
        packageInfoModal.hidden = false;

        setTimeout(() => {
          const modalControl = packageInfoModal.shadowRoot?.querySelector('.control');
          const contentCol = packageInfoModal.querySelector('.col');
          if (modalControl && contentCol) {
            const height = contentCol.clientHeight;
            modalControl.style.setProperty('--dialog-height', `${height + 14}px`);
          }
        }, 1);
      }
    });
  });

  const packageInfoListingHelp = document.getElementById('packageInfoListingHelp');
  if (packageInfoListingHelp && addListingToVccHelp) {
    packageInfoListingHelp.addEventListener('click', () => {
      addListingToVccHelp.hidden = false;
    });
  }
})();