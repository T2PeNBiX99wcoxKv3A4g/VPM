import { webLightTheme, webDarkTheme } from 'https://esm.sh/@fluentui/tokens';

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

/* ==========================================================================
   Theme Management
   ========================================================================== */

const THEME_STORAGE_KEY = 'vpm_theme_preference';

const getPreferredTheme = () => {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const applyTheme = (themeName) => {
  const isLight = themeName === 'light';
  document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');

  const themeTokens = isLight ? webLightTheme : webDarkTheme;
  if (window.Fluent?.setTheme) {
    window.Fluent.setTheme(themeTokens);
  } else if (themeTokens) {
    for (const [key, value] of Object.entries(themeTokens)) {
      document.documentElement.style.setProperty(`--${key}`, value);
    }
  }
};

const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
  showToast(`Switched to ${nextTheme} theme`);
};

/* ==========================================================================
   Toast Notification System
   ========================================================================== */

let toastTimeout = null;

const showToast = (message = 'Copied to clipboard!') => {
  const toast = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');
  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;
  toast.removeAttribute('hidden');
  toast.hidden = false;

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.setAttribute('hidden', '');
    toast.hidden = true;
  }, 2200);
};

/* ==========================================================================
   Dialog / Modal Helpers
   ========================================================================== */

const showDialog = (dialog) => {
  if (!dialog) return;
  dialog.removeAttribute('hidden');
  dialog.hidden = false;
  if (typeof dialog.show === 'function') {
    dialog.show();
  }
  document.body.style.overflow = 'hidden';
};

const hideDialog = (dialog) => {
  if (!dialog) return;
  if (typeof dialog.hide === 'function') {
    dialog.hide();
  }
  dialog.setAttribute('hidden', '');
  dialog.hidden = true;

  const anyOpen = document.querySelectorAll('fluent-dialog:not([hidden])').length > 0;
  if (!anyOpen) {
    document.body.style.overflow = '';
  }
};

/* ==========================================================================
   Clipboard Copy Helper
   ========================================================================== */

const copyToClipboard = (textOrElement, buttonElement, successMsg = 'Copied to clipboard!') => {
  let value = '';
  if (typeof textOrElement === 'string') {
    value = textOrElement;
  } else if (textOrElement) {
    const innerInput = textOrElement.shadowRoot?.querySelector('input') || textOrElement;
    value = textOrElement.value || innerInput.value || textOrElement.getAttribute('value') || textOrElement.textContent || '';
    if (typeof innerInput.select === 'function') {
      try {
        innerInput.select();
      } catch (_) {}
    }
  }

  if (!value) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).then(() => {
      showToast(successMsg);
    }).catch(() => {
      fallbackCopy(value, successMsg);
    });
  } else {
    fallbackCopy(value, successMsg);
  }

  if (buttonElement) {
    const copyTextSpan = buttonElement.querySelector('.btn-copy-text');
    const originalHtml = copyTextSpan ? copyTextSpan.textContent : null;
    if (copyTextSpan) copyTextSpan.textContent = 'Copied!';
    buttonElement.classList.add('btn-copied');

    setTimeout(() => {
      if (copyTextSpan && originalHtml) copyTextSpan.textContent = originalHtml;
      buttonElement.classList.remove('btn-copied');
    }, 1500);
  }
};

const fallbackCopy = (text, successMsg) => {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(successMsg);
  } catch (err) {
    console.error('Failed to copy', err);
  }
};

/* ==========================================================================
   Application Initialization
   ========================================================================== */

(() => {
  // 1. Initialize Theme
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!localStorage.getItem(THEME_STORAGE_KEY)) {
      applyTheme(getPreferredTheme());
    }
  });

  // 2. Package Count & Search Filter
  const packageGrid = document.getElementById('packageGrid');
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const searchKbdTip = document.getElementById('searchKbdTip');
  const packageCountBadge = document.getElementById('packageCountBadge');
  const noResultsState = document.getElementById('noResultsState');
  const resetSearchBtn = document.getElementById('resetSearchBtn');

  const getPackageRows = () => {
    if (!packageGrid) return [];
    return Array.from(packageGrid.querySelectorAll('fluent-data-grid-row:not([row-type="header"]), .package-card-row'));
  };

  const updatePackageCount = (visibleCount, totalCount) => {
    if (!packageCountBadge) return;
    if (visibleCount === totalCount) {
      packageCountBadge.textContent = `${totalCount} ${totalCount === 1 ? 'package' : 'packages'}`;
    } else {
      packageCountBadge.textContent = `${visibleCount} of ${totalCount} packages`;
    }
  };

  const initialRows = getPackageRows();
  const totalPackages = initialRows.length;
  updatePackageCount(totalPackages, totalPackages);

  const filterPackages = (query) => {
    const term = (query || '').trim().toLowerCase();
    const rows = getPackageRows();
    let visibleCount = 0;

    rows.forEach(row => {
      if (!term) {
        row.style.display = '';
        visibleCount++;
        return;
      }

      const pkgName = (row.dataset?.packageName || '').toLowerCase();
      const pkgId = (row.dataset?.packageId || '').toLowerCase();
      const pkgDesc = (row.dataset?.packageDesc || '').toLowerCase();
      const pkgType = (row.dataset?.packageType || '').toLowerCase();

      const matched = pkgName.includes(term) || pkgId.includes(term) || pkgDesc.includes(term) || pkgType.includes(term);
      if (matched) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    if (noResultsState) {
      if (visibleCount === 0 && totalPackages > 0) {
        noResultsState.removeAttribute('hidden');
        noResultsState.hidden = false;
      } else {
        noResultsState.setAttribute('hidden', '');
        noResultsState.hidden = true;
      }
    }

    if (searchClearBtn) {
      if (term.length > 0) {
        searchClearBtn.removeAttribute('hidden');
        searchClearBtn.hidden = false;
        if (searchKbdTip) searchKbdTip.style.display = 'none';
      } else {
        searchClearBtn.setAttribute('hidden', '');
        searchClearBtn.hidden = true;
        if (searchKbdTip) searchKbdTip.style.display = '';
      }
    }

    updatePackageCount(visibleCount, totalPackages);
  };

  if (searchInput) {
    searchInput.addEventListener('input', (e) => filterPackages(e.target.value));
    searchInput.addEventListener('change', (e) => filterPackages(e.target.value));
  }

  if (searchClearBtn && searchInput) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      filterPackages('');
      searchInput.focus();
    });
  }

  if (resetSearchBtn && searchInput) {
    resetSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      filterPackages('');
      searchInput.focus();
    });
  }

  // Keyboard shortcut '/' to search
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) {
      e.preventDefault();
      searchInput?.focus();
      searchInput?.select();
    } else if (e.key === 'Escape') {
      const openDialogs = document.querySelectorAll('fluent-dialog:not([hidden])');
      openDialogs.forEach(dialog => hideDialog(dialog));
      if (searchInput && document.activeElement === searchInput && searchInput.value) {
        searchInput.value = '';
        filterPackages('');
      }
    }
  });

  // 3. Quick Copy ID Buttons on Package Cards
  document.querySelectorAll('.copy-id-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const copyText = btn.dataset?.copyText;
      if (copyText) {
        copyToClipboard(copyText, null, `Copied ID: ${copyText}`);
      }
    });
  });

  // 4. Help Dialog Modals
  const urlBarHelpButton = document.getElementById('urlBarHelp');
  const addListingToVccHelp = document.getElementById('addListingToVccHelp');
  const addListingToVccHelpClose = document.getElementById('addListingToVccHelpClose');

  if (urlBarHelpButton && addListingToVccHelp) {
    urlBarHelpButton.addEventListener('click', () => showDialog(addListingToVccHelp));
  }

  if (addListingToVccHelpClose && addListingToVccHelp) {
    addListingToVccHelpClose.addEventListener('click', () => hideDialog(addListingToVccHelp));
  }

  // 5. Copy Buttons for Listing URLs
  const vccListingInfoUrlFieldCopy = document.getElementById('vccListingInfoUrlFieldCopy');
  const vccListingInfoUrlField = document.getElementById('vccListingInfoUrlField');
  if (vccListingInfoUrlFieldCopy && vccListingInfoUrlField) {
    vccListingInfoUrlFieldCopy.addEventListener('click', () => {
      copyToClipboard(vccListingInfoUrlField, vccListingInfoUrlFieldCopy, 'Repository URL copied!');
    });
  }

  const vccUrlFieldCopy = document.getElementById('vccUrlFieldCopy');
  const vccUrlField = document.getElementById('vccUrlField');
  if (vccUrlFieldCopy && vccUrlField) {
    vccUrlFieldCopy.addEventListener('click', () => {
      copyToClipboard(vccUrlField, vccUrlFieldCopy, 'Repository URL copied!');
    });
  }

  const packageInfoVccUrlFieldCopy = document.getElementById('packageInfoVccUrlFieldCopy');
  const packageInfoVccUrlField = document.getElementById('packageInfoVccUrlField');
  if (packageInfoVccUrlFieldCopy && packageInfoVccUrlField) {
    packageInfoVccUrlFieldCopy.addEventListener('click', () => {
      copyToClipboard(packageInfoVccUrlField, packageInfoVccUrlFieldCopy, 'Repository URL copied!');
    });
  }

  // 6. VCC Deep Link Handlers
  const addRepoToVcc = () => {
    const url = LISTING_URL || vccUrlField?.value;
    if (url) {
      window.location.assign(`vcc://vpm/addRepo?url=${encodeURIComponent(url)}`);
    }
  };

  const vccAddRepoButton = document.getElementById('vccAddRepoButton');
  if (vccAddRepoButton) {
    vccAddRepoButton.addEventListener('click', addRepoToVcc);
  }

  document.querySelectorAll('.modalAddRepoTrigger').forEach(btn => {
    btn.addEventListener('click', addRepoToVcc);
  });

  const rowAddToVccButtons = document.querySelectorAll('.rowAddToVccButton');
  rowAddToVccButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      addRepoToVcc();
    });
  });

  // 7. Context Menu for Download (Compatibility)
  const rowMoreMenu = document.getElementById('rowMoreMenu');
  let currentDownloadUrl = null;

  const hideRowMoreMenu = (e) => {
    if (rowMoreMenu && !rowMoreMenu.contains(e.target)) {
      document.removeEventListener('click', hideRowMoreMenu);
      rowMoreMenu.hidden = true;
      rowMoreMenu.setAttribute('hidden', '');
    }
  };

  const rowMenuButtons = document.querySelectorAll('.rowMenuButton');
  rowMenuButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetButton = e.currentTarget || e.target.closest('.rowMenuButton');
      currentDownloadUrl = targetButton?.dataset?.packageUrl;

      if (rowMoreMenu && currentDownloadUrl) {
        const rect = targetButton.getBoundingClientRect();
        rowMoreMenu.style.top = `${rect.bottom + window.scrollY + 4}px`;
        rowMoreMenu.style.left = `${rect.right + window.scrollX - 160}px`;
        rowMoreMenu.removeAttribute('hidden');
        rowMoreMenu.hidden = false;

        setTimeout(() => {
          document.addEventListener('click', hideRowMoreMenu);
        }, 1);
      }
    });
  });

  const rowMoreMenuDownload = document.getElementById('rowMoreMenuDownload');
  if (rowMoreMenuDownload) {
    rowMoreMenuDownload.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentDownloadUrl) {
        window.open(currentDownloadUrl, '_blank');
      }
      if (rowMoreMenu) {
        rowMoreMenu.hidden = true;
        rowMoreMenu.setAttribute('hidden', '');
      }
      document.removeEventListener('click', hideRowMoreMenu);
    });
  }

  // 8. Package Info Modal Setup
  const packageInfoModal = document.getElementById('packageInfoModal');
  const packageInfoModalClose = document.getElementById('packageInfoModalClose');

  if (packageInfoModalClose && packageInfoModal) {
    packageInfoModalClose.addEventListener('click', () => hideDialog(packageInfoModal));
  }

  // Dialog backdrop dismiss handling
  [addListingToVccHelp, packageInfoModal].forEach(dialog => {
    if (!dialog) return;
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        hideDialog(dialog);
      }
    });
    dialog.addEventListener('toggle', (e) => {
      if (e.newState === 'closed') {
        dialog.setAttribute('hidden', '');
        dialog.hidden = true;
      }
    });
  });

  const packageInfoName = document.getElementById('packageInfoName');
  const packageInfoId = document.getElementById('packageInfoId');
  const packageInfoVersion = document.getElementById('packageInfoVersion');
  const packageInfoDescription = document.getElementById('packageInfoDescription');
  const packageInfoAuthor = document.getElementById('packageInfoAuthor');
  const packageInfoDependencies = document.getElementById('packageInfoDependencies');
  const packageInfoDependenciesContainer = document.getElementById('packageInfoDependenciesContainer');
  const packageInfoKeywords = document.getElementById('packageInfoKeywords');
  const packageInfoKeywordsContainer = document.getElementById('packageInfoKeywordsContainer');
  const packageInfoLicense = document.getElementById('packageInfoLicense');
  const packageInfoLicenseContainer = document.getElementById('packageInfoLicenseContainer');

  const rowPackageInfoButtons = document.querySelectorAll('.rowPackageInfoButton');
  rowPackageInfoButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetButton = e.currentTarget || e.target.closest('.rowPackageInfoButton');
      const packageId = targetButton?.dataset?.packageId;
      const packageInfo = PACKAGES?.[packageId];

      if (!packageInfo) {
        console.warn(`Package info for '${packageId}' not found in PACKAGES map.`, PACKAGES);
        return;
      }

      if (packageInfoName) packageInfoName.textContent = packageInfo.displayName || packageInfo.name || packageId;
      if (packageInfoId) packageInfoId.textContent = packageId;
      if (packageInfoVersion) packageInfoVersion.textContent = packageInfo.version ? `v${packageInfo.version}` : '';
      if (packageInfoDescription) packageInfoDescription.textContent = packageInfo.description || 'No description provided.';

      if (packageInfoAuthor) {
        packageInfoAuthor.textContent = packageInfo.author?.name || 'Unknown Author';
        packageInfoAuthor.href = packageInfo.author?.url || '#';
      }

      if (packageInfoKeywords && packageInfoKeywordsContainer) {
        const keywords = packageInfo.keywords || [];
        if (keywords.length === 0) {
          packageInfoKeywordsContainer.style.display = 'none';
        } else {
          packageInfoKeywordsContainer.style.display = '';
          packageInfoKeywords.innerHTML = '';
          keywords.forEach(keyword => {
            const keywordBadge = document.createElement('span');
            keywordBadge.className = 'badge';
            keywordBadge.textContent = keyword;
            packageInfoKeywords.appendChild(keywordBadge);
          });
        }
      }

      if (packageInfoLicense && packageInfoLicenseContainer) {
        const license = packageInfo.license;
        const licenseUrl = packageInfo.licensesUrl;
        if (!license && !licenseUrl) {
          packageInfoLicenseContainer.style.display = 'none';
        } else {
          packageInfoLicenseContainer.style.display = '';
          packageInfoLicense.textContent = license || 'License';
          packageInfoLicense.href = licenseUrl || '#';
        }
      }

      if (packageInfoDependencies && packageInfoDependenciesContainer) {
        const depEntries = Object.entries(packageInfo.dependencies || {});
        if (depEntries.length === 0) {
          packageInfoDependenciesContainer.style.display = 'none';
        } else {
          packageInfoDependenciesContainer.style.display = '';
          packageInfoDependencies.innerHTML = '';
          depEntries.forEach(([name, version]) => {
            const depRow = document.createElement('li');
            depRow.textContent = `${name} @ v${version}`;
            packageInfoDependencies.appendChild(depRow);
          });
        }
      }

      if (packageInfoModal) {
        showDialog(packageInfoModal);
      }
    });
  });

  const packageInfoListingHelp = document.getElementById('packageInfoListingHelp');
  if (packageInfoListingHelp && addListingToVccHelp) {
    packageInfoListingHelp.addEventListener('click', () => {
      showDialog(addListingToVccHelp);
    });
  }
})();
