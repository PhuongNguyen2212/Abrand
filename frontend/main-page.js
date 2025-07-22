const API_BASE_URL = "https://api.giangkimhoan.com";
const ITEMS_PER_PAGE = 12;

// Cart storage
let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];

const AVAILABLE_SIZES = ["6", "7", "8", "9", "10"];
const AVAILABLE_MATERIALS = ["Vàng 10k", "Vàng 18k", "Bạc", "Bạch kim"];

// Format number with dots for VND (e.g., 1200000 -> 1.200.000)
function formatVND(number) {
    // Convert to number and remove decimal places if it's a whole number
    const num = Number(number);
    const isWholeNumber = Number.isInteger(num);
    const formattedNumber = isWholeNumber ? num.toString() : num.toFixed(2);
    return formattedNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Case-insensitive mapping for brand and type
const brandMap = {
    "gkh jewelry": "GKH Jewelry",
    "cartier": "Cartier",
    "bvlgari": "Bvlgari",
    "van cleef & arpels": "Van Cleef & Arpels",
    "chrome hearts": "Chrome Hearts",
    "gucci": "Gucci",
    "louis vuiton": "Louis Vuiton"
};

const typeMap = {
    "nhẫn": "Ring",
    "vòng tay": "Bracelet",
    "dây chuyền": "Necklace",
    "mặt dây": "Collar",
    "khuyên tai": "Earring"
};

function setupCustomNav(products) {
    const nav = document.getElementById('custom-nav');
    const navContent = nav?.querySelector('.nav-content');
    const toggleSubmenus = nav?.querySelectorAll('.toggle-submenu');
    const filterLabels = nav?.querySelectorAll('.filter-label');
    const resetBtn = document.getElementById('reset-filters');
    const sortSubmenu = document.getElementById('sort-submenu');
    const sortLabel = sortSubmenu?.closest('li').querySelector('.label strong');

    if (!nav || !navContent || !toggleSubmenus || !filterLabels || !resetBtn || !sortSubmenu || !sortLabel) {
        console.warn('Navigation elements not found');
        return;
    }

    // Filter and sort state
    let filterState = {
        activeFilter: null, // 'price', 'type', or null
        sort: 'newest' // 'newest', 'oldest', 'popular', 'price_asc', 'price_desc', 'name_asc', 'name_desc'
    };

    // Update sort submenu options based on active filter
    function updateSortOptions() {
        sortSubmenu.innerHTML = '';
        let sortOptions = [];
        if (filterState.activeFilter === 'price') {
            sortOptions = [
                { value: 'price_desc', text: 'Giá: Giảm dần' },
                { value: 'price_asc', text: 'Giá: Tăng dần' }
            ];
            filterState.sort = 'price_desc'; // Default to descending price
            sortLabel.textContent = 'GIÁ: GIẢM DẦN';
        } else if (filterState.activeFilter === 'type') {
            sortOptions = [
                { value: 'name_asc', text: 'Thứ tự bảng chữ cái' },
                { value: 'name_desc', text: 'Thứ tự bảng chữ cái ngược' }
            ];
            filterState.sort = 'name_asc'; // Default to ascending name
            sortLabel.textContent = 'THỨ TỰ BẢNG CHỮ CÁI';
        } else {
            sortOptions = [
                { value: 'newest', text: 'Mới nhất' },
                { value: 'oldest', text: 'Cũ nhất' },
                { value: 'popular', text: 'Phổ biến' }
            ];
            filterState.sort = 'newest'; // Default to newest
            sortLabel.textContent = 'MỚI NHẤT';
        }

        sortOptions.forEach(option => {
            const li = document.createElement('li');
            li.setAttribute('data-sort', option.value);
            li.textContent = option.text;
            sortSubmenu.appendChild(li);
        });
    }

    // Apply filters and sorting
    function applyFiltersAndSort(products) {
        let filteredProducts = [...products]; // No specific filtering, just sorting
        return filteredProducts.sort((a, b) => {
            const priceA = a.salePrice > 0 ? Number(a.salePrice) : Number(a.originalPrice);
            const priceB = b.salePrice > 0 ? Number(b.salePrice) : Number(b.originalPrice);
            const nameA = a.name?.toLowerCase() || '';
            const nameB = b.name?.toLowerCase() || '';

            switch (filterState.sort) {
                case 'newest':
                    return (b.createdAt || 0) - (a.createdAt || 0);
                case 'oldest':
                    return (a.createdAt || 0) - (b.createdAt || 0);
                case 'popular':
                    return (b.popularity || 0) - (a.popularity || 0);
                case 'price_asc':
                    return priceA - priceB;
                case 'price_desc':
                    return priceB - priceA;
                case 'name_asc':
                    return nameA.localeCompare(nameB);
                case 'name_desc':
                    return nameB.localeCompare(nameA);
                default:
                    return 0;
            }
        });
    }

    // Helper to apply filters and render products
    function applyFiltersAndRender() {
        const params = new URLSearchParams(window.location.search);
        const brand = params.get('brand')?.toLowerCase();
        let filteredProducts = products;
        if (brand && brand !== 'all') {
            filteredProducts = filteredProducts.filter(product =>
                product.brand && (
                    product.brand.toLowerCase() === brand ||
                    brandMap[product.brand.toLowerCase()]?.toLowerCase() === brand
                )
            );
        }
        filteredProducts = applyFiltersAndSort(filteredProducts);
        renderProducts(filteredProducts, 'all-products');
    }

    // Toggle main submenus (category, filter, sort)
    toggleSubmenus.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const submenu = toggle.nextElementSibling;
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggleSubmenus.forEach(t => {
                const sm = t.nextElementSibling;
                if (sm !== submenu) {
                    sm.classList.remove('open');
                    t.setAttribute('aria-expanded', 'false');
                }
            });
            submenu.classList.toggle('open', !isExpanded);
            toggle.setAttribute('aria-expanded', !isExpanded);
        });
    });

    // Apply filters
    filterLabels.forEach(label => {
        label.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = label.closest('.filter-parent');
            const filterType = parent.getAttribute('data-filter-type');
            filterState.activeFilter = filterType;

            // Update filter label
            label.textContent = label.textContent.toUpperCase();

            // Update sort options based on active filter
            updateSortOptions();

            // Close filter submenu
            parent.closest('.submenu').classList.remove('open');
            parent.closest('li').querySelector('.toggle-submenu').setAttribute('aria-expanded', 'false');

            // Apply filters and render
            applyFiltersAndRender();
        });
    });

    // Apply sorting
    sortSubmenu.addEventListener('click', (e) => {
        const sortItem = e.target.closest('[data-sort]');
        if (sortItem) {
            e.stopPropagation();
            filterState.sort = sortItem.getAttribute('data-sort');
            sortLabel.textContent = sortItem.textContent.toUpperCase();
            sortSubmenu.classList.remove('open');
            sortSubmenu.closest('li').querySelector('.toggle-submenu').setAttribute('aria-expanded', 'false');
            applyFiltersAndRender();
        }
    });

    // Reset filters
    resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterState = { activeFilter: null, sort: 'newest' };
        document.querySelectorAll('.filter-parent .filter-label strong').forEach(label => {
            const parentText = label.closest('.filter-parent').textContent.toLowerCase();
            label.textContent = parentText.includes('giá') ? 'LỌC THEO GIÁ' : 'LỌC THEO LOẠI';
        });
        sortLabel.textContent = 'MỚI NHẤT';
        updateSortOptions();
        toggleSubmenus.forEach(t => {
            t.nextElementSibling.classList.remove('open');
            t.setAttribute('aria-expanded', 'false');
        });
        applyFiltersAndRender();
    });

    // Close submenus on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-items')) {
            toggleSubmenus.forEach(t => {
                t.nextElementSibling.classList.remove('open');
                t.setAttribute('aria-expanded', 'false');
            });
        }
    });

    // Close submenus on Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            toggleSubmenus.forEach(t => {
                t.nextElementSibling.classList.remove('open');
                t.setAttribute('aria-expanded', 'false');
            });
        }
    });

    // Initialize with default sorting
    updateSortOptions();
    applyFiltersAndRender();
}

// Function to set up navigation for sub-submenu items
function setupSubmenuNavigation(subSubmenuList, parentTitle, title, submenuData) {
    subSubmenuList.innerHTML = '';
    const parentItems = submenuData[parentTitle] || [];
    const subItems = parentItems.find(item => item.text === title)?.subItems || [];
    subItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'xai-sub-submenu-item';
        div.innerHTML = `<a href="#" class="flex-grow">${item.text}</a>`;
        div.addEventListener('click', (e) => {
            e.preventDefault();
            const brand = brandMap[title.toLowerCase()] || title;
            const type = typeMap[item.text.toLowerCase()] || item.text;
            console.log(`Navigating to product-page.html with brand=${brand}&type=${type}`);
            window.location.href = `product-page.html?brand=${encodeURIComponent(brand)}&type=${encodeURIComponent(type)}`;
        });
        subSubmenuList.appendChild(div);
    });
}

// Setup search functionality
function setupSearch(products) {
    const searchIcon = document.querySelector('.search .icon');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    if (!searchIcon || !searchInput || !searchResults) {
        console.warn('Search elements not found, skipping search initialization');
        return;
    }

    searchIcon.addEventListener('click', () => {
        const isHidden = searchInput.style.display === 'none' || !searchInput.style.display;
        searchInput.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            searchInput.focus();
        } else {
            searchInput.value = '';
            searchResults.style.display = 'none';
        }
    });

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        searchResults.innerHTML = '';

        if (query.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        if (products.error || !Array.isArray(products)) {
            console.error('Invalid product data:', products.error || 'Not an array');
            const errorItem = document.createElement('div');
            errorItem.className = 'no-results';
            errorItem.textContent = 'Unable to load products. Please try again later.';
            searchResults.appendChild(errorItem);
            searchResults.style.display = 'block';
            return;
        }

        const filteredProducts = products.filter(product => {
            const nameMatch = product.name?.toLowerCase().includes(query);
            const brandMatch = product.brand?.toLowerCase().includes(query);
            const typeMatch = product.type?.toLowerCase().includes(query);
            const materialMatch = product.material?.toLowerCase().includes(query);
            const salePriceMatch = product.salePrice != null && String(product.salePrice).includes(query);
            const originalPriceMatch = product.originalPrice != null && String(product.originalPrice).includes(query);
            return nameMatch || brandMatch || typeMatch || materialMatch || salePriceMatch || originalPriceMatch;
        });

        if (filteredProducts.length > 0) {
            filteredProducts.slice(0, 10).forEach(product => {
                const productData = {
                    id: product.id || `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    name: product.name || 'Unnamed Product',
                    brand: product.brand || 'Unknown Brand',
                    salePrice: product.salePrice != null ? Number(product.salePrice) : 0,
                    originalPrice: product.originalPrice != null ? Number(product.originalPrice) : 0,
                    imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
                    mainImageIndex: product.mainImageIndex != null ? Number(product.mainImageIndex) : 0
                };

                // Select the main image
                let imageUrl = `${API_BASE_URL}/backend/uploads/default-image.jpg`; // Default fallback
                if (productData.imageUrls.length > 0) {
                    const mainImageIndex = Math.min(productData.mainImageIndex, productData.imageUrls.length - 1);
                    imageUrl = productData.imageUrls[mainImageIndex]
                        ? `${API_BASE_URL}${productData.imageUrls[mainImageIndex].startsWith('/') ? '' : '/'}${productData.imageUrls[mainImageIndex]}`
                        : imageUrl;
                }

                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.innerHTML = `
                    <img src="${imageUrl}" alt="${productData.name}" loading="lazy" onerror="this.src='${API_BASE_URL}/backend/uploads/default-image.jpg'; console.error('Image failed to load:', '${imageUrl}')">
                    <div class="content">
                        <span class="brand">${brandMap[productData.brand.toLowerCase()] || productData.brand}</span>
                        <span class="item">${productData.name}</span>
                        <div class="price">
                            ${productData.salePrice > 0 ? `<span class="sale-price">${formatVND(productData.salePrice)} VND</span>` : ''}
                            <span class="original-price">${productData.originalPrice > 0 ? formatVND(productData.originalPrice) : 'N/A'} VND</span>
                        </div>
                    </div>
                `;
                resultItem.addEventListener('click', () => {
                    console.log(`Navigating to product-details.html for product ID: ${productData.id}`);
                    window.location.href = `product-details.html?id=${encodeURIComponent(productData.id)}`;
                });
                searchResults.appendChild(resultItem);
            });
            searchResults.style.display = 'block';
        } else {
            const noResult = document.createElement('div');
            noResult.className = 'no-results';
            noResult.textContent = 'Không tìm thấy sản phẩm';
            searchResults.appendChild(noResult);
            searchResults.style.display = 'block';
        }
    });

    document.addEventListener('click', (event) => {
        if (!searchInput.contains(event.target) && !searchResults.contains(event.target) && !searchIcon.contains(event.target)) {
            searchInput.style.display = 'none';
            searchInput.value = '';
            searchResults.style.display = 'none';
        }
    });

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            searchInput.value = '';
            searchInput.style.display = 'none';
            searchResults.style.display = 'none';
        }
    });
}

// Initialize sidebar
function initializeSidebar() {
    const submenuData = {
        "TRANG SỨC": [
            { text: "TẤT CẢ TRANG SỨC", href: "product-page.html", subItems: [] },
            { text: "MỚI NHẤT", href: "#", subItems: [] },
            {
                text: "GKH JEWELRY", href: "#", subItems: [
                    { text: "NHẪN", href: "#" },
                    { text: "VÒNG TAY", href: "#" },
                    { text: "DÂY CHUYỀN", href: "#" },
                    { text: "MẶT DÂY", href: "#" },
                    { text: "KHUYÊN TAI", href: "#" }
                ]
            },
            {
                text: "CARTIER", href: "#", subItems: [
                    { text: "NHẪN", href: "#" },
                    { text: "VÒNG TAY", href: "#" },
                    { text: "DÂY CHUYỀN", href: "#" },
                    { text: "MẶT DÂY", href: "#" },
                    { text: "KHUYÊN TAI", href: "#" }
                ]
            },
            {
                text: "BVLGARI", href: "#", subItems: [
                    { text: "NHẪN", href: "#" },
                    { text: "VÒNG TAY", href: "#" },
                    { text: "DÂY CHUYỀN", href: "#" },
                    { text: "MẶT DÂY", href: "#" },
                    { text: "KHUYÊN TAI", href: "#" }
                ]
            },
            {
                text: "VAN CLEEF & ARPELS", href: "#", subItems: [
                    { text: "NHẪN", href: "#" },
                    { text: "VÒNG TAY", href: "#" },
                    { text: "DÂY CHUYỀN", href: "#" },
                    { text: "MẶT DÂY", href: "#" },
                    { text: "KHUYÊN TAI", href: "#" }
                ]
            },
            {
                text: "CHROME HEARTS", href: "#", subItems: [
                    { text: "NHẪN", href: "#" },
                    { text: "VÒNG TAY", href: "#" },
                    { text: "DÂY CHUYỀN", href: "#" },
                    { text: "MẶT DÂY", href: "#" },
                    { text: "KHUYÊN TAI", href: "#" }
                ]
            },
            {
                text: "LOUIS VUITON", href: "#", subItems: [
                    { text: "NHẪN", href: "#" },
                    { text: "VÒNG TAY", href: "#" },
                    { text: "DÂY CHUYỀN", href: "#" },
                    { text: "MẶT DÂY", href: "#" },
                    { text: "KHUYÊN TAI", href: "#" }
                ]
            },
            {
                text: "CHANEL", href: "#", subItems: [
                    { text: "NHẪN", href: "#" },
                    { text: "VÒNG TAY", href: "#" },
                    { text: "DÂY CHUYỀN", href: "#" },
                    { text: "MẶT DÂY", href: "#" },
                    { text: "KHUYÊN TAI", href: "#" }
                ]
            }
        ]
    };

    const sidebar = document.getElementById('xai-sidebar');
    const toggleButton = document.getElementById('xai-sidebar-toggle');
    const closeButton = document.getElementById('xai-sidebar-close');
    const mainContent = document.getElementById('xai-main-content');
    const submenuContent = document.getElementById('xai-submenu-content');
    const subSubmenuContent = document.getElementById('xai-sub-submenu-content');
    const menuItemsContainer = document.querySelectorAll('.xai-menu-item-container');
    const backButton = document.getElementById('xai-back-button');
    const subSubmenuBackButton = document.getElementById('xai-sub-submenu-back-button');
    const submenuTitle = document.getElementById('xai-submenu-title');
    const submenuList = document.getElementById('xai-submenu-list');
    const subSubmenuTitle = document.getElementById('xai-sub-submenu-title');
    const subSubmenuList = document.getElementById('xai-sub-submenu-list');

    if (!sidebar || !mainContent || !submenuContent || !subSubmenuContent || !submenuList || !subSubmenuList) {
        console.warn('One or more sidebar elements are missing, skipping sidebar initialization');
        return;
    }

    if (toggleButton) toggleButton.addEventListener('click', toggleSidebar);
    else console.warn('Sidebar toggle button (xai-sidebar-toggle) not found');

    if (closeButton) closeButton.addEventListener('click', toggleSidebar);
    else console.warn('Sidebar close button (xai-sidebar-close) not found');

    if (backButton) backButton.addEventListener('click', showMainMenu);
    else console.warn('Back button (xai-back-button) not found');

    if (subSubmenuBackButton) subSubmenuBackButton.addEventListener('click', () => {
        const currentTitle = submenuTitle.textContent;
        showSubmenu(currentTitle);
    });
    else console.warn('Sub-submenu back button (xai-sub-submenu-back-button) not found');

    function showMainMenu() {
        mainContent.classList.remove('xai-content-hidden');
        mainContent.classList.add('xai-content-visible');
        submenuContent.classList.remove('xai-content-visible');
        submenuContent.classList.add('xai-content-hidden');
        subSubmenuContent.classList.remove('xai-content-visible');
        subSubmenuContent.classList.add('xai-content-hidden');
    }

    function showSubmenu(title) {
        mainContent.classList.remove('xai-content-visible');
        mainContent.classList.add('xai-content-hidden');
        submenuContent.classList.remove('xai-content-hidden');
        submenuContent.classList.add('xai-content-visible');
        subSubmenuContent.classList.remove('xai-content-visible');
        subSubmenuContent.classList.add('xai-content-hidden');
        submenuTitle.textContent = title;
        submenuList.innerHTML = '';
        const items = submenuData[title] || [];
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'xai-submenu-item';
            div.innerHTML = `<a href="${item.href}" class="flex-grow">${item.text}</a>${item.subItems && item.subItems.length >= 0 ? '<span>></span>' : ''}`;
            div.addEventListener('click', (e) => {
                e.preventDefault();
                if (item.text === "TẤT CẢ TRANG SỨC") {
                    console.log("Navigating to product-page.html to show all products");
                    window.location.href = "product-page.html";
                } else if (item.subItems && item.subItems.length > 0) {
                    showSubSubmenu(title, item.text);
                } else {
                    console.log(`Navigating to product-page.html for ${item.text}`);
                    window.location.href = `product-page.html?category=${encodeURIComponent(item.text)}`;
                }
            });
            submenuList.appendChild(div);
        });
    }

    function showSubSubmenu(parentTitle, title) {
        submenuContent.classList.remove('xai-content-visible');
        submenuContent.classList.add('xai-content-hidden');
        subSubmenuContent.classList.remove('xai-content-hidden');
        subSubmenuContent.classList.add('xai-content-visible');
        subSubmenuTitle.textContent = title;
        setupSubmenuNavigation(subSubmenuList, parentTitle, title, submenuData);
    }

    function toggleSidebar() {
        sidebar.classList.toggle('xai-active');
    }

    menuItemsContainer.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const title = item.getAttribute('data-title');
            if (submenuData[title]) showSubmenu(title);
            else {
                const urlMap = {
                    "DỊCH VỤ": "#dich-vu",
                    "QUÝ TRÌNH SẢN XUẤT": "#quy-trinh-san-xuat",
                    "ƯU ĐÃI": "#uu-dai",
                    "VỀ CHÚNG TÔI": "#ve-chung-toi",
                    "TIN TỨC": "news-page.html",
                    "LOGIN": "admin.html"
                };
                window.location.href = urlMap[title] || `#${title.toLowerCase().replace(/\s/g, '-')}`;
            }
        });
    });
}

// Initialize services scroll
function initializeServicesScroll() {
    console.log('Searching for .services container');
    const servicesContainer = document.querySelector('.services');
    if (!servicesContainer) {
        console.warn('No .services container found on the page.');
        return;
    }

    let isDragging = false;
    let startX;
    let scrollLeft;

    // Event listener functions
    const handleMouseDown = (e) => {
        isDragging = true;
        startX = e.pageX - servicesContainer.offsetLeft;
        scrollLeft = servicesContainer.scrollLeft;
        servicesContainer.style.cursor = 'grabbing';
        console.log('Drag started');
    };

    const handleMouseLeave = () => {
        isDragging = false;
        servicesContainer.style.cursor = 'grab';
        console.log('Drag ended (mouseleave)');
    };

    const handleMouseUp = () => {
        isDragging = false;
        servicesContainer.style.cursor = 'grab';
        console.log('Drag ended (mouseup)');
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - servicesContainer.offsetLeft;
        const walk = (x - startX) * 4;
        servicesContainer.scrollLeft = scrollLeft - walk;
        console.log('Dragging, scrollLeft:', servicesContainer.scrollLeft);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY;
        const scrollAmount = 150;
        servicesContainer.scrollLeft += delta > 0 ? scrollAmount : -scrollAmount;
        console.log('Wheel scrolled, scrollLeft:', servicesContainer.scrollLeft);
    };

    // Function to initialize scroll handlers
    function initializeScrollHandlers() {
        servicesContainer.addEventListener('mousedown', handleMouseDown);
        servicesContainer.addEventListener('mouseleave', handleMouseLeave);
        servicesContainer.addEventListener('mouseup', handleMouseUp);
        servicesContainer.addEventListener('mousemove', handleMouseMove);
        servicesContainer.addEventListener('wheel', handleWheel);

        const images = servicesContainer.querySelectorAll('.service-icon');
        images.forEach(img => {
            img.setAttribute('draggable', 'false');
            console.log('Image drag disabled for:', img.src);
        });
    }

    // Function to remove scroll handlers
    function removeScrollHandlers() {
        servicesContainer.removeEventListener('mousedown', handleMouseDown);
        servicesContainer.removeEventListener('mouseleave', handleMouseLeave);
        servicesContainer.removeEventListener('mouseup', handleMouseUp);
        servicesContainer.removeEventListener('mousemove', handleMouseMove);
        servicesContainer.removeEventListener('wheel', handleWheel);
        console.log('Scroll handlers removed');
    }

    // Check if the viewport is 600px or less
    const mediaQuery = window.matchMedia('(max-width: 600px)');

    // Function to handle media query changes
    function handleMediaQuery(e) {
        if (e.matches) {
            console.log('Viewport is 600px or less, initializing scroll handlers');
            initializeScrollHandlers();
        } else {
            console.log('Viewport is larger than 600px, removing scroll handlers');
            removeScrollHandlers();
        }
    }

    // Run on initial load
    handleMediaQuery(mediaQuery);

    // Listen for changes in the media query
    mediaQuery.addEventListener('change', handleMediaQuery);
}

// Initialize column toggle
function initializeColumnToggle() {
    const wrappers = document.querySelectorAll('.column .column-wrapper');
    wrappers.forEach(wrapper => {
        wrapper.addEventListener('click', function () {
            const contentWrapper = this.nextElementSibling;
            const arrow = this.querySelector('.arrow');

            if (contentWrapper && contentWrapper.classList.contains('content-wrapper')) {
                // Close other sections
                document.querySelectorAll('.column .content-wrapper.show').forEach(other => {
                    if (other !== contentWrapper) {
                        other.classList.remove('show');
                        other.style.maxHeight = '0';
                        const otherArrow = other.previousElementSibling.querySelector('.arrow');
                        if (otherArrow) otherArrow.classList.remove('show');
                    }
                });

                const isOpen = contentWrapper.classList.toggle('show');
                contentWrapper.style.maxHeight = isOpen ? `${contentWrapper.scrollHeight}px` : '0';
                if (arrow) arrow.classList.toggle('show', isOpen);
            }
        });
    });
}

function addToCart(item) {
    if (!item.id || !item.name || !item.price || !item.originalPrice) {
        console.warn("Skipping item due to missing required fields:", item);
        return;
    }

    // Ensure item has a size and material; default to first available if not provided or invalid
    const itemSize = item.size || AVAILABLE_SIZES[0];
    const itemMaterial = AVAILABLE_MATERIALS.includes(item.material) ? item.material : AVAILABLE_MATERIALS[0];

    // Find existing item with case-insensitive material comparison
    const existingItem = cartItems.find(cartItem =>
        cartItem.id === item.id &&
        cartItem.size === itemSize &&
        (cartItem.material || AVAILABLE_MATERIALS[0]).toLowerCase() === itemMaterial.toLowerCase()
    );

    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
        console.log(`Updated quantity for item ID ${item.id}, size ${itemSize}, material ${itemMaterial} to ${existingItem.quantity}:`, existingItem);
    } else {
        const newItem = {
            ...item,
            quantity: 1,
            size: itemSize,
            material: itemMaterial
        };
        cartItems.push(newItem);
        console.log(`Added new item to cart:`, newItem);
    }

    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    updateCartCount();
}

function updateCartCount() {
    const shoppingBagIcon = document.querySelector('.shopping-bag');
    if (!shoppingBagIcon) return;

    const existingBadge = shoppingBagIcon.querySelector('.cart-badge');
    if (existingBadge) existingBadge.remove();

    const totalQuantity = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (totalQuantity > 0) {
        const badge = document.createElement('span');
        badge.className = 'cart-badge';
        badge.textContent = totalQuantity;
        shoppingBagIcon.appendChild(badge);
    }
}

function displayCartItems() {
    const modalBody = document.getElementById('modal-body');
    const announcement = document.getElementById('cart-announcement');
    const cartModal = document.getElementById('cartModal');
    if (!modalBody || !announcement || !cartModal) return;

    console.log("Current cartItems:", cartItems);

    modalBody.innerHTML = '';

    if (cartItems.length === 0) {
        cartModal.style.display = 'none';
        announcement.classList.add('show');
        setTimeout(() => announcement.classList.remove('show'), 3000);
        return;
    }

    announcement.classList.remove('show');
    cartModal.style.display = 'flex';

    cartItems.forEach((item, index) => {
        if (!item.name || !item.price || !item.originalPrice) {
            console.warn("Skipping invalid cart item:", item);
            return;
        }

        console.log(`Rendering cart item ${index}:`, item);
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.style.cssText = 'display: flex; align-items: center; padding: 10px; gap: 10px;';
        const imageSrc = item.image || 'fallback-image.jpg';
        console.log(`Image source for ${item.name}:`, imageSrc);
        itemElement.innerHTML = `
            <div class="cart-image-container" style="background-color: #f8f8f8; padding: 20px;">
                <img src="${imageSrc}" alt="${item.name}" style="width: 150px; height: 150px; object-fit: cover;" onerror="this.src='fallback-image.jpg'; console.error('Image failed to load:', '${item.image}')">
            </div>
            <div class="content">
                <span class="item">${item.name}</span>
                <div class="price">
                    <span class="sale-price">${item.price}</span>
                    <span class="original-price">${item.originalPrice}</span>
                </div>
                <div class="material-section" style="margin-top: 10px;">
                    <select class="materials" id="material-select-${index}" data-index="${index}" style="border: none; padding: 5px; line-height: 1; font-size: 14px; appearance: none;">
                        ${AVAILABLE_MATERIALS.map(material => `
                            <option value="${material}" ${item.material === material ? 'selected' : ''}>${material}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="quantity-section" style="display: flex; flex-direction: row; gap: 10px; margin-top: 10px;">
                    <div class="quantity-label" style="margin-top: 10px;">
                        <span class="so-luong">Số lượng: ${item.quantity || 1}</span>
                    </div>
                    <div class="quantity-controls" style="display: flex; gap: 5px;">
                        <button class="quantity-decrement" data-index="${index}" style="background: none; border: 1px solid #ccc; padding: 5px 10px; cursor: pointer;">-</button>
                        <button class="quantity-increment" data-index="${index}" style="background: none; border: 1px solid #ccc; padding: 5px 10px; cursor: pointer;">+</button>
                    </div>
                </div>
                <div class="size-section" style="margin-bottom: 10px;">
                    <label for="size-select-${index}" style="margin-right: 10px;">Kích thước:</label>
                    <select class="size-select" id="size-select-${index}" data-index="${index}">
                        ${AVAILABLE_SIZES.map(size => `
                            <option value="${size}" ${item.size === size ? 'selected' : ''}>${size}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `;
        modalBody.appendChild(itemElement);
    });

    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            cartItems.splice(index, 1);
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            updateCartCount();
            displayCartItems();
        });
    });

    document.querySelectorAll('.quantity-increment').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            cartItems[index].quantity = (cartItems[index].quantity || 1) + 1;
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            updateCartCount();
            displayCartItems();
        });
    });

    document.querySelectorAll('.quantity-decrement').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (cartItems[index].quantity > 1) {
                cartItems[index].quantity -= 1;
            } else {
                cartItems.splice(index, 1);
            }
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            updateCartCount();
            displayCartItems();
        });
    });

    document.querySelectorAll('.size-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const newSize = e.target.value;
            const currentItem = cartItems[index];

            // Check if an item with the same id, new size, and same material exists
            const existingItem = cartItems.find((item, i) =>
                i !== index && item.id === currentItem.id && item.size === newSize && item.material === currentItem.material
            );

            if (existingItem) {
                // Merge quantities and remove the current item
                existingItem.quantity = (existingItem.quantity || 1) + (currentItem.quantity || 1);
                cartItems.splice(index, 1);
                console.log(`Merged item ID ${currentItem.id} with size ${newSize}, material ${currentItem.material}, new quantity: ${existingItem.quantity}`);
            } else {
                // Update the size of the current item
                currentItem.size = newSize;
                console.log(`Updated size for item ID ${currentItem.id} to ${newSize}:`, currentItem);
            }

            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            displayCartItems(); // Re-render to reflect changes
        });
    });

    document.querySelectorAll('.materials').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const newMaterial = e.target.value;
            const currentItem = cartItems[index];

            // Validate newMaterial
            if (!AVAILABLE_MATERIALS.includes(newMaterial)) {
                console.warn(`Invalid material ${newMaterial} for item ID ${currentItem.id}, reverting to ${currentItem.material}`);
                e.target.value = currentItem.material;
                return;
            }

            // Check if an item with the same id, size, and new material exists
            const existingItem = cartItems.find((item, i) =>
                i !== index && item.id === currentItem.id && item.size === currentItem.size && item.material === newMaterial
            );

            if (existingItem) {
                // Merge quantities and remove the current item
                existingItem.quantity = (existingItem.quantity || 1) + (currentItem.quantity || 1);
                cartItems.splice(index, 1);
                console.log(`Merged item ID ${currentItem.id} with size ${currentItem.size}, material ${newMaterial}, new quantity: ${existingItem.quantity}`);
            } else {
                // Update the material of the current item
                currentItem.material = newMaterial;
                console.log(`Updated material for item ID ${currentItem.id} to ${newMaterial}:`, currentItem);
            }

            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            // Avoid re-render to prevent flicker, unless merging occurred
            if (!existingItem) {
                select.value = newMaterial; // Ensure UI reflects change
            } else {
                displayCartItems(); // Re-render if merged
            }
        });
    });
}

function renderProductCheckout() {
    console.log('Running renderProductCheckout');
    const cartItemsContainer = document.getElementById('cartItems');
    const totalPriceElement = document.getElementById('totalPrice');
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];

    if (!cartItemsContainer || !totalPriceElement) {
        console.error("Required DOM elements not found: cartItemsContainer or totalPriceElement missing");
        return;
    }

    cartItemsContainer.innerHTML = '';

    if (cartItems.length === 0) {
        console.log('Cart is empty');
        cartItemsContainer.innerHTML = '<p class="error-message">Giỏ hàng trống. Vui lòng thêm sản phẩm để tiếp tục.</p>';
        totalPriceElement.textContent = '0 VND';
        return;
    }

    let totalPrice = 0;

    cartItems.forEach((item, index) => {
        if (!item.name || !item.price || !item.originalPrice) {
            console.warn("Skipping invalid cart item:", item);
            return;
        }

        console.log(`Rendering cart item ${index}:`, item);
        const salePrice = parseInt(item.price.replace(/[^0-9]/g, '')) || 0;
        totalPrice += salePrice * (item.quantity || 1);

        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.style.cssText = 'display: flex; align-items: center; padding: 10px; gap: 10px;';
        const imageSrc = item.image || 'fallback-image.jpg';
        itemElement.innerHTML = `
            <div class="cart-image-container" style="background-color: #f8f8f8; padding: 20px;">
                <img src="${imageSrc}" alt="${item.name}" style="width: 150px; height: 150px; object-fit: cover;" onerror="this.src='fallback-image.jpg'; console.error('Image failed to load:', '${item.image}')">
            </div>
            <div class="content">
                <span class="item">${item.name}</span>
                <div class="price">
                    <span class="sale-price">${item.price}</span>
                    <span class="original-price">${item.originalPrice}</span>
                </div>
                <div class="material-section" style="margin-top: 10px;">
                    <select class="materials" id="material-select-${index}" data-index="${index}" style="border: none; padding: 5px; line-height: 1; font-size: 14px; appearance: none;">
                        ${AVAILABLE_MATERIALS.map(material => `
                            <option value="${material}" ${item.material === material ? 'selected' : ''}>${material}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="quantity-section" style="display: flex; flex-direction: row; gap: 10px; margin-top: 10px;">
                    <div class="quantity-label" style="margin-top: 10px;">
                        <span class="so-luong">Số lượng: ${item.quantity || 1}</span>
                    </div>
                    <div class="quantity-controls" style="display: flex; gap: 5px;">
                        <button class="quantity-decrement" data-index="${index}" style="background: none; border: 1px solid #ccc; padding: 5px 10px; cursor: pointer;">-</button>
                        <button class="quantity-increment" data-index="${index}" style="background: none; border: 1px solid #ccc; padding: 5px 10px; cursor: pointer;">+</button>
                    </div>
                </div>
                <div class="size-section" style="margin-bottom: 10px;">
                    <label for="size-select-${index}" style="margin-right: 10px;">Kích thước:</label>
                    <select class="size-select" id="size-select-${index}" data-index="${index}">
                        ${AVAILABLE_SIZES.map(size => `
                            <option value="${size}" ${item.size === size ? 'selected' : ''}>${size}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            <button class="remove-item" data-index="${index}" style="margin-left: auto; background: none; border: none; color: red; cursor: pointer;">✕</button>
        `;
        cartItemsContainer.appendChild(itemElement);
    });

    totalPriceElement.textContent = `${formatVND(totalPrice)} VND`;
    console.log('Total price:', totalPriceElement.textContent);

    // Event listeners for remove buttons
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            console.log(`Removing item at index ${index}`);
            cartItems.splice(index, 1);
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            updateCartCount();
            renderProductCheckout();
        });
    });

    // Event listeners for quantity increment
    document.querySelectorAll('.quantity-increment').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            cartItems[index].quantity = (cartItems[index].quantity || 1) + 1;
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            updateCartCount();
            renderProductCheckout();
        });
    });

    // Event listeners for quantity decrement
    document.querySelectorAll('.quantity-decrement').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (cartItems[index].quantity > 1) {
                cartItems[index].quantity -= 1;
            } else {
                cartItems.splice(index, 1);
            }
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            updateCartCount();
            renderProductCheckout();
        });
    });

    // Event listeners for size selection
    document.querySelectorAll('.size-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const newSize = e.target.value;
            const currentItem = cartItems[index];

            // Check if an item with the same id, new size, and same material exists
            const existingItem = cartItems.find((item, i) =>
                i !== index && item.id === currentItem.id && item.size === newSize && item.material === currentItem.material
            );

            if (existingItem) {
                // Merge quantities and remove the current item
                existingItem.quantity = (existingItem.quantity || 1) + (currentItem.quantity || 1);
                cartItems.splice(index, 1);
                console.log(`Merged item ID ${currentItem.id} with size ${newSize}, material ${currentItem.material}, new quantity: ${existingItem.quantity}`);
            } else {
                // Update the size of the current item
                currentItem.size = newSize;
                console.log(`Updated size for item ID ${currentItem.id} to ${newSize}:`, currentItem);
            }

            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            renderProductCheckout(); // Re-render to reflect changes
        });
    });

    // Event listeners for material selection
    document.querySelectorAll('.materials').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const newMaterial = e.target.value;
            const currentItem = cartItems[index];

            // Validate newMaterial
            if (!AVAILABLE_MATERIALS.includes(newMaterial)) {
                console.warn(`Invalid material ${newMaterial} for item ID ${currentItem.id}, reverting to ${currentItem.material}`);
                e.target.value = currentItem.material;
                return;
            }

            // Check if an item with the same id, size, and new material exists
            const existingItem = cartItems.find((item, i) =>
                i !== index && item.id === currentItem.id && item.size === currentItem.size && item.material === newMaterial
            );

            if (existingItem) {
                // Merge quantities and remove the current item
                existingItem.quantity = (existingItem.quantity || 1) + (currentItem.quantity || 1);
                cartItems.splice(index, 1);
                console.log(`Merged item ID ${currentItem.id} with size ${currentItem.size}, material ${newMaterial}, new quantity: ${existingItem.quantity}`);
            } else {
                // Update the material of the current item
                currentItem.material = newMaterial;
                console.log(`Updated material for item ID ${currentItem.id} to ${newMaterial}:`, currentItem);
            }

            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            // Avoid re-render to prevent flicker, unless merging occurred
            if (!existingItem) {
                select.value = newMaterial; // Ensure UI reflects change
            } else {
                renderProductCheckout(); // Re-render if merged
            }
        });
    });
}

// Toggle card details visibility based on payment method
function setupPaymentMethodToggle() {
    console.log('Running setupPaymentMethodToggle');
    const codRadio = document.getElementById('cod');
    const cardRadio = document.getElementById('card');
    const cardDetails = document.getElementById('cardDetails');

    if (!codRadio || !cardRadio || !cardDetails) {
        console.error("Payment method elements not found");
        return;
    }

    function toggleCardDetails() {
        cardDetails.classList.toggle('hidden', !cardRadio.checked);
        const cardFields = cardDetails.querySelectorAll('input');
        cardFields.forEach(field => field.required = cardRadio.checked);
    }

    codRadio.addEventListener('change', toggleCardDetails);
    cardRadio.addEventListener('change', toggleCardDetails);
}

// Handle form submission
function setupFormSubmission() {
    console.log('Running setupFormSubmission');
    const paymentForm = document.getElementById('paymentForm');
    if (!paymentForm) {
        console.error("Payment form not found");
        return;
    }

    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(paymentForm);
        const paymentData = {
            fullName: formData.get('fullName'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            paymentMethod: formData.get('paymentMethod'),
            cardNumber: formData.get('cardNumber'),
            expiryDate: formData.get('expiryDate'),
            cvv: formData.get('cvv'),
            cartItems: JSON.parse(localStorage.getItem('cartItems')) || [],
            totalPrice: document.getElementById('totalPrice').textContent
        };

        console.log("Payment data:", paymentData);
        localStorage.setItem('orderData', JSON.stringify(paymentData));
        localStorage.removeItem('cartItems');
        window.location.href = 'confirmation.html';
    });
}

async function fetchNews() {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const url = `${API_BASE_URL}/api/news`;
            console.log(`Fetching news (Attempt ${attempt}) from ${url}`);
            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                mode: "cors",
                cache: "no-cache"
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            const result = await response.json();
            console.log(`Fetched news:`, result);
            return Array.isArray(result) ? result : result.data || [];
        } catch (error) {
            console.error(`Fetch attempt ${attempt} failed:`, error);
            if (attempt === MAX_RETRIES) {
                return { error: `Error loading news: ${error.message}. Check if backend is running at ${API_BASE_URL}.` };
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}

async function fetchNewsById(newsId) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const url = `${API_BASE_URL}/api/news/${encodeURIComponent(newsId)}`;
            console.log(`Fetching news item (Attempt ${attempt}) from ${url}`);
            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                mode: "cors",
                cache: "no-cache"
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            const newsItem = await response.json();
            console.log(`Fetched news item with ID ${newsId}:`, newsItem);
            return newsItem;
        } catch (error) {
            console.error(`Fetch attempt ${attempt} for news ID ${newsId} failed:`, error);
            if (attempt === MAX_RETRIES) {
                return { error: `Error loading news item: ${error.message}. Check if backend is running at ${API_BASE_URL}.` };
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}

function renderNews(news, containerId, startIndex = 0, limit = Infinity) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }

    container.innerHTML = '';

    if (news.error || !Array.isArray(news)) {
        console.error("News fetch error or invalid data:", news.error || "Not an array");
        container.innerHTML = `<p class="text-red-600 text-center">Unable to load news. Please try again later.</p>`;
        return;
    }

    const newsToDisplay = news.slice(startIndex, startIndex + limit);
    console.log(`Rendering ${newsToDisplay.length} news items for container ${containerId} from index ${startIndex}`);

    if (newsToDisplay.length === 0) {
        container.innerHTML = `<p class="text-gray-600 text-center">No news available.</p>`;
        return;
    }

    newsToDisplay.forEach(item => {
        if (!item.id || !item.title) {
            console.warn("Skipping invalid news item:", item);
            return;
        }

        const newsItem = document.createElement("div");
        newsItem.className = "news-item";
        const imageUrl = item.imageUrl
            ? `${API_BASE_URL}${item.imageUrl.startsWith('/') ? '' : '/'}${item.imageUrl}`
            : `${API_BASE_URL}/img/placeholder.png`;
        newsItem.innerHTML = `
            <img src="${imageUrl}" alt="${item.title || 'News Image'}" onerror="this.src='${API_BASE_URL}/img/placeholder.png'; console.error('Image failed to load:', '${imageUrl}')">
            <div class="news-content">
                <h3>${item.title || 'Untitled'}</h3>
                <p>${item.content ? item.content.substring(0, 50) + (item.content.length > 50 ? "..." : "") : 'No content available'}</p>
                <a href="news-details.html?newsId=${encodeURIComponent(item.id)}" class="read-more" data-news-id="${item.id}">Đọc thêm</a>
            </div>
        `;
        container.appendChild(newsItem);
    });

    const readMoreLinks = container.querySelectorAll('.read-more');
    console.log(`Found ${readMoreLinks.length} read-more links`);
    readMoreLinks.forEach(link => {
        console.log('Attaching event listener to read-more link with newsId:', link.getAttribute('data-news-id'));
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const newsId = link.getAttribute('data-news-id');
            console.log('Read more clicked for newsId:', newsId);
            window.location.href = `news-details.html?newsId=${encodeURIComponent(newsId)}`;
        });
    });
}

async function setupPagination() {
    // Fetch all news items (use a large limit to get all items)
    const allNews = await fetchNews(1, 1000);
    if (allNews.error || !Array.isArray(allNews)) {
        renderNews(allNews, 'newsGrid');
        return;
    }

    const totalItems = allNews.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    console.log(`Total items: ${totalItems}, Total pages: ${totalPages}`);

    // Render first page
    renderNews(allNews, 'newsGrid', 0, ITEMS_PER_PAGE);

    // Handle pagination
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) {
        console.error('Pagination container not found');
        return;
    }
    paginationContainer.innerHTML = ''; // Clear pagination

    // If 12 or fewer items, hide pagination
    if (totalItems <= ITEMS_PER_PAGE) {
        console.log('12 or fewer items, hiding pagination');
        return;
    }

    // Create pagination buttons
    for (let page = 1; page <= totalPages; page++) {
        const button = document.createElement('button');
        button.className = `page-btn${page === 1 ? ' active' : ''}`;
        button.textContent = page;
        button.onclick = () => showPage(page, allNews);
        paginationContainer.appendChild(button);
    }
}

async function loadPage(page, allNews) {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, allNews.length);
    console.log(`Loading page ${page}: items ${startIndex + 1} to ${endIndex}`);
    renderNews(allNews, 'newsGrid', startIndex, ITEMS_PER_PAGE);
}

function showPage(pageNum, allNews) {
    console.log(`Showing page ${pageNum}`);
    loadPage(pageNum, allNews);

    // Update active button
    document.querySelectorAll('.page-btn').forEach(btn => btn.classList.remove('active'));
    const activeButton = Array.from(document.querySelectorAll('.page-btn')).find(
        btn => btn.textContent === pageNum.toString()
    );
    if (activeButton) {
        activeButton.classList.add('active');
    } else {
        console.warn(`Page button for page ${pageNum} not found`);
    }
}

async function showNewsDetails(newsId) {
    const newsGrid = document.getElementById('newsGrid');
    const newsDetail = document.getElementById('news-detail');
    const newsContent = document.getElementById('news-content');

    if (!newsGrid || !newsDetail || !newsContent) {
        console.error('Required DOM elements not found for news details');
        return;
    }

    // Fetch the news item
    const newsItem = await fetchNewsById(newsId);
    console.log('Fetched news item for details:', newsItem);

    if (newsItem.error || !newsItem) {
        console.error('Failed to fetch news item:', newsItem.error || 'No news data');
        newsContent.innerHTML = `<p class="text-red-600 text-center">Error loading news article</p>`;
        newsDetail.classList.remove('hidden');
        newsGrid.classList.add('hidden');
        return;
    }

    if (!newsItem.content) {
        console.error('Invalid news item data:', newsItem);
        newsContent.innerHTML = `<p class="text-red-600 text-center">No content available</p>`;
        newsDetail.classList.remove('hidden');
        newsGrid.classList.add('hidden');
        return;
    }

    // Display only the content
    newsContent.innerHTML = newsItem.content || 'No content available';
    newsDetail.classList.remove('hidden');
    newsGrid.classList.add('hidden');

    // Scroll to the top of the news detail section
    document.querySelector('.news-title').scrollIntoView({ behavior: 'smooth' });
}

function setupBackButton() {
    const backButton = document.getElementById('back-to-news');
    const newsGrid = document.getElementById('newsGrid');
    const newsDetail = document.getElementById('news-detail');

    if (!backButton || !newsGrid || !newsDetail) {
        console.warn('Back button or related elements not found');
        return;
    }

    backButton.addEventListener('click', () => {
        newsDetail.classList.add('hidden');
        newsGrid.classList.remove('hidden');
        document.querySelector('.news-title').scrollIntoView({ behavior: 'smooth' });
    });
}

// Fetch products with retry logic
async function fetchProducts(productId = null) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const url = productId
                ? `${API_BASE_URL}/api/products?id=${encodeURIComponent(productId)}`
                : `${API_BASE_URL}/api/products`;
            console.log(`Fetching products (Attempt ${attempt}) from ${url}`);
            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                mode: "cors",
                cache: "no-cache"
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            const products = await response.json();
            console.log("Fetched products:", products);

            if (productId) {
                const product = Array.isArray(products) ? products.find(p => p.id === productId) : products;
                if (!product) {
                    throw new Error(`Product with ID ${productId} not found`);
                }
                return product; // Return single product
            }
            return products; // Return array of products
        } catch (error) {
            console.error(`Fetch attempt ${attempt} failed:`, error);
            if (attempt === MAX_RETRIES) {
                return { error: `Error loading products: ${error.message}. Check if backend is running at ${API_BASE_URL}.` };
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}

// Setup brand filters with navigation to product-page.html
async function setupBrandFilters(products) {
    const brandLinks = document.querySelectorAll(".brand-container .brand-item");
    brandLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const brand = link.dataset.brand;
            console.log(`Navigating to product-page.html with brand=${brand}`);
            window.location.href = `product-page.html?brand=${encodeURIComponent(brand)}`;
        });
    });
}

// Function to update heading based on URL parameters
function updateHeadingFromURL() {
    const heading = document.getElementById('product-heading');
    if (!heading) {
        console.warn("Heading with id 'product-heading' not found");
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const brand = params.get('brand') ? decodeURIComponent(params.get('brand')).toLowerCase() : null;
    const category = params.get('category') ? decodeURIComponent(params.get('category')).toLowerCase() : null;

    console.log("Updating heading - Brand:", brand, "Category:", category);

    if (category === "mới nhất") {
        heading.textContent = "NEW ARRIVALS";
        console.log("Heading set to: NEW ARRIVALS");
    } else if (brand && brand !== "all") {
        heading.textContent = brandMap[brand] || brand.toUpperCase();
        console.log("Heading set to:", heading.textContent);
    } else {
        heading.textContent = "All Products";
        console.log("Heading set to All Products");
    }
}

// Render products
function renderProducts(products, containerId, startIndex = 0, limit = Infinity) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }
    container.innerHTML = "";

    if (products.error || !Array.isArray(products)) {
        console.error("Product fetch error or invalid data:", products.error || "Not an array");
        container.innerHTML = `<p class="error-message text-red-600 text-center">Unable to load products. Please try again later or contact support.</p>`;
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const brand = params.get('brand') ? decodeURIComponent(params.get('brand')).toLowerCase() : null;
    const type = params.get('type') ? decodeURIComponent(params.get('type')).toLowerCase() : null;
    console.log("URL params - brand:", brand || "none", "type:", type || "none");

    let filteredProducts = [...products];
    if (brand && brand !== "all") {
        filteredProducts = filteredProducts.filter(product =>
            product.brand && (
                product.brand.toLowerCase() === brand ||
                brandMap[product.brand.toLowerCase()]?.toLowerCase() === brand
            )
        );
    }
    if (type && type !== "all") {
        filteredProducts = filteredProducts.filter(product => product.type && product.type.toLowerCase() === type);
    }

    const displayedProducts = filteredProducts.slice(startIndex, startIndex + limit);
    if (displayedProducts.length === 0) {
        const message = `No products available for ${brand || 'all brands'}${type ? ` and type ${type}` : ''}.`;
        container.innerHTML = `<p class="text-gray-600 text-center">${message}</p>`;
        return;
    }

    // Handle suggestion section
    if (containerId === 'suggestion') {
        // Create carousel structure
        const carouselWrapper = document.createElement('div');
        carouselWrapper.className = 'suggestion-carousel';

        const productContainer = document.createElement('div');
        productContainer.className = 'suggestion-products';

        // Append products
        displayedProducts.forEach((product, index) => {
            const productData = {
                id: product.id || `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: product.name || "Unknown Product",
                brand: product.brand || "Unknown Brand",
                salePrice: product.salePrice != null ? Number(product.salePrice) : 0,
                originalPrice: product.originalPrice != null ? Number(product.originalPrice) : 0,
                imageUrls: product.imageUrls || [],
                mainImageIndex: product.mainImageIndex != null ? Number(product.mainImageIndex) : 0,
                type: product.type || "Unknown Type",
                material: product.material || "Unknown Material"
            };

            let imageUrl = productData.imageUrls[productData.mainImageIndex] || productData.imageUrls[0] || "/backend/uploads/image-placeholder.jpg";
            imageUrl = imageUrl.startsWith('http')
                ? imageUrl
                : `${API_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            console.log(`Image URL for product "${productData.name}" (ID: ${productData.id}):`, imageUrl);

            const productElement = document.createElement("a");
            productElement.href = `product-details.html?id=${encodeURIComponent(productData.id)}&brand=${encodeURIComponent(productData.brand)}&name=${encodeURIComponent(productData.name)}&salePrice=${productData.salePrice}&originalPrice=${productData.originalPrice}&imageUrl=${encodeURIComponent(imageUrl)}`;
            productElement.className = "product-link slide-in-bottom";
            productElement.style.setProperty('--animation-delay', `${index * 0.1}s`);
            productElement.innerHTML = `
                <div class="new-arrivals-item">
                    <img src="${imageUrl}" alt="${productData.name}" class="brand-item" loading="lazy" onerror="this.src='${API_BASE_URL}/backend/uploads/image-placeholder.jpg'; console.error('Image failed to load:', '${imageUrl}')">
                    <span class="brand">${brandMap[productData.brand.toLowerCase()] || productData.brand}</span>
                    <span class="item">${productData.name}</span>
                    <div class="price">
                        ${productData.salePrice > 0 ? `<span class="sale-price">${formatVND(productData.salePrice)} VND</span>` : ''}
                        <span class="original-price">${productData.originalPrice > 0 ? formatVND(productData.originalPrice) : 'N/A'} VND</span>
                    </div>
                </div>
            `;
            productContainer.appendChild(productElement);
        });

        // Add chevron buttons
        const leftChevron = document.createElement('div');
        leftChevron.className = 'icon-container left-chevron';
        leftChevron.innerHTML = '<i class="fas fa-chevron-left"></i>';

        const rightChevron = document.createElement('div');
        rightChevron.className = 'icon-container right-chevron';
        rightChevron.innerHTML = '<i class="fas fa-chevron-right"></i>';

        // Append elements to carousel wrapper
        carouselWrapper.appendChild(leftChevron);
        carouselWrapper.appendChild(productContainer);
        carouselWrapper.appendChild(rightChevron);
        container.appendChild(carouselWrapper);

        // Navigation logic (adapted from Box Carousel)
        leftChevron.addEventListener('click', () => {
            productContainer.scrollBy({ left: -270, behavior: 'smooth' }); // Product width (250px) + gap (20px)
        });

        rightChevron.addEventListener('click', () => {
            productContainer.scrollBy({ left: 270, behavior: 'smooth' });
        });
    } else {
        // Regular product rendering for other sections
        displayedProducts.forEach((product, index) => {
            const productData = {
                id: product.id || `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: product.name || "Unknown Product",
                brand: product.brand || "Unknown Brand",
                salePrice: product.salePrice != null ? Number(product.salePrice) : 0,
                originalPrice: product.originalPrice != null ? Number(product.originalPrice) : 0,
                imageUrls: product.imageUrls || [],
                mainImageIndex: product.mainImageIndex != null ? Number(product.mainImageIndex) : 0,
                type: product.type || "Unknown Type",
                material: product.material || "Unknown Material"
            };

            let imageUrl = productData.imageUrls[productData.mainImageIndex] || productData.imageUrls[0] || "/backend/uploads/image-placeholder.jpg";
            imageUrl = imageUrl.startsWith('http')
                ? imageUrl
                : `${API_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            console.log(`Image URL for product "${productData.name}" (ID: ${productData.id}):`, imageUrl);

            const productElement = document.createElement("a");
            productElement.href = `product-details.html?id=${encodeURIComponent(productData.id)}&brand=${encodeURIComponent(productData.brand)}&name=${encodeURIComponent(productData.name)}&salePrice=${productData.salePrice}&originalPrice=${productData.originalPrice}&imageUrl=${encodeURIComponent(imageUrl)}`;
            productElement.className = "product-link slide-in-bottom";
            productElement.style.setProperty('--animation-delay', `${index * 0.1}s`);
            productElement.innerHTML = `
                <div class="new-arrivals-item">
                    <img src="${imageUrl}" alt="${productData.name}" class="brand-item" loading="lazy" onerror="this.src='${API_BASE_URL}/backend/uploads/image-placeholder.jpg'; console.error('Image failed to load:', '${imageUrl}')">
                    <span class="brand">${brandMap[productData.brand.toLowerCase()] || productData.brand}</span>
                    <span class="item">${productData.name}</span>
                    <div class="price">
                        ${productData.salePrice > 0 ? `<span class="sale-price">${formatVND(productData.salePrice)} VND</span>` : ''}
                        <span class="original-price">${productData.originalPrice > 0 ? formatVND(productData.originalPrice) : 'N/A'} VND</span>
                    </div>
                </div>
            `;
            container.appendChild(productElement);
        });
    }

    // Set up Intersection Observer for animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    container.querySelectorAll('.product-link').forEach(link => {
        observer.observe(link);
    });

    // Inject CSS for slide-in animation
    const style = document.createElement('style');
    style.textContent = `
        .slide-in-bottom {
            opacity: 0;
            transform: translateY(50px);
            transition: opacity 0.5s ease-out, transform 0.5s ease-out;
            transition-delay: var(--animation-delay, 0s);
        }
        .slide-in-bottom.visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
}

// Render product details
async function renderProductDetails() {
    if (!window.location.pathname.includes('product-details.html')) return;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    console.log('Product ID from URL:', productId);

    const container = document.getElementById('product-details');
    if (!container) {
        console.error('Product details container not found');
        return;
    }

    if (!productId) {
        console.error('No product ID provided in URL');
        container.innerHTML = `<p class="text-red-600 text-center">No product specified</p>`;
        return;
    }

    const product = await fetchProducts(productId);
    console.log('Fetched product:', product);

    if (product.error || !product) {
        console.error('Failed to fetch product:', product.error || 'No product data');
        container.innerHTML = `<p class="text-red-600 text-center">Error loading product data</p>`;
        return;
    }

    if (!product.id || !product.name || !product.brand || !product.salePrice || !product.originalPrice || !product.imageUrls || !product.type || !product.material) {
        console.error('Invalid product data:', product);
        container.innerHTML = `<p class="text-red-600 text-center">Invalid product data</p>`;
        return;
    }

    // Update static elements
    const productCodeElement = document.getElementById('product-code');
    const productMaterialListElement = document.getElementById('product-material-list');
    const productTypeElement = document.getElementById('product-type');
    const productDescriptionElement = document.getElementById('product-description');
    const productDescriptionContentElement = document.getElementById('product-description-content');
    const productTypeContentElement = document.getElementById('product-type-content');
    const productMaterialContentElement = document.getElementById('product-material-content');

    if (productCodeElement) {
        productCodeElement.textContent = product.id;
    }
    if (productTypeElement) {
        productTypeElement.textContent = product.type;
    }
    if (productMaterialListElement) {
        productMaterialListElement.textContent = product.material;
    }
    if (productDescriptionElement) {
        productDescriptionElement.textContent = product.description || 'Không có mô tả sản phẩm.';
    }
    if (productDescriptionContentElement) {
        productDescriptionContentElement.textContent = product.description || 'Không có mô tả chi tiết.';
    }
    if (productTypeContentElement) {
        productTypeContentElement.textContent = product.type || 'Không có thông tin mẫu sức.';
    }
    if (productMaterialContentElement) {
        productMaterialContentElement.textContent = product.material || 'Không có thông tin chất liệu.';
    }

    // Reorder images to show main image first
    const mainImageIndex = product.mainImageIndex || 0;
    const orderedImageUrls = [...product.imageUrls];
    if (mainImageIndex < orderedImageUrls.length) {
        const [mainImage] = orderedImageUrls.splice(mainImageIndex, 1);
        orderedImageUrls.unshift(mainImage);
    }
    const imageUrls = orderedImageUrls.map(url => `${API_BASE_URL}${url}` || 'fallback-image.jpg');
    console.log('Ordered image URLs:', imageUrls);

    // Render product details
    container.innerHTML = `
        <div class="arrivals-item">
            <div class="brand">${product.brand}</div>
            <div class="image-container">
                <div class="image-scrolling">
                    <div class="icon-container left-chevron">
                        <i class="fa-solid fa-chevron-left"></i>
                    </div>
                    <img src="${imageUrls[0]}" alt="${product.name}" class="brand-item" loading="lazy" onerror="this.src='fallback-image.jpg'; console.error('Image failed to load:', '${imageUrls[0]}')">
                    <div class="icon-container right-chevron">
                        <i class="fa-solid fa-chevron-right"></i>
                    </div>
                </div>
                <div class="page-numer">1/${imageUrls.length}</div>
            </div>
            <div class="details-container">
                <div class="content">
                    <span class="item">${product.name}</span>
                    <div class="price">
                        <span class="sale-price">${formatVND(product.salePrice)} VND</span>
                        <span class="original-price">${formatVND(product.originalPrice)} VND</span>
                    </div>
                    <div class="material-section">
                        <span class="materials">${product.material}</span>
                        <span>Giá cả có thể thay đổi tại thời điểm đặt hàng</span>
                    </div>
                    <div class="buttons">
                        <div class="buy-now">Mua ngay</div>
                        <div class="zalo-contact">Liên hệ trực tiếp zalo</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Carousel functionality
    let currentImageIndex = 0;
    const imgElement = container.querySelector('.brand-item');
    const pageNumberElement = container.querySelector('.page-numer');
    const leftChevron = container.querySelector('.left-chevron');
    const rightChevron = container.querySelector('.right-chevron');

    function updateImage() {
        imgElement.src = imageUrls[currentImageIndex];
        imgElement.alt = product.name;
        pageNumberElement.textContent = `${currentImageIndex + 1}/${imageUrls.length}`;
    }

    if (leftChevron) {
        leftChevron.addEventListener('click', () => {
            currentImageIndex = (currentImageIndex - 1 + imageUrls.length) % imageUrls.length;
            updateImage();
        });
    }

    if (rightChevron) {
        rightChevron.addEventListener('click', () => {
            currentImageIndex = (currentImageIndex + 1) % imageUrls.length;
            updateImage();
        });
    }

    const buyNowButton = container.querySelector('.buy-now');
    if (buyNowButton) {
        buyNowButton.addEventListener('click', (e) => {
            e.preventDefault();
            const itemContainer = e.target.closest('.arrivals-item');
            if (!itemContainer) {
                console.error('Item container not found');
                return;
            }

            const item = {
                id: product.id,
                name: itemContainer.querySelector('.item')?.textContent || 'Unnamed Product',
                price: itemContainer.querySelector('.sale-price')?.textContent || '0 VND',
                originalPrice: itemContainer.querySelector('.original-price')?.textContent || '0 VND',
                image: imageUrls[0],
                material: product.material,
                type: product.type,
                brand: product.brand,
                description: product.description
            };

            console.log('Adding to cart:', item);
            addToCart(item);
        });
    }

    // Expand/collapse functionality
    const expandableSections = document.querySelectorAll('.expandable');
    expandableSections.forEach(section => {
        const title = section.querySelector('.section-title');
        const content = section.querySelector('.section-content');
        if (title && content) {
            title.addEventListener('click', () => {
                const isExpanded = section.classList.contains('expanded');
                if (isExpanded) {
                    content.style.maxHeight = '0';
                    section.classList.remove('expanded');
                } else {
                    content.style.maxHeight = `${content.scrollHeight}px`;
                    section.classList.add('expanded');
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    });
}

// Function to render confirmation page
function renderConfirmationPage() {
    const orderData = JSON.parse(localStorage.getItem('orderData')) || {};

    document.getElementById('fullName').innerText = orderData.fullName || 'N/A';
    document.getElementById('phone').innerText = orderData.phone || 'N/A';
    document.getElementById('address').innerText = orderData.address || 'N/A';
    document.getElementById('paymentMethod').innerText =
        orderData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card Payment';

    const cartItemsContainer = document.getElementById('cartItems');
    const totalPriceElement = document.getElementById('totalPrice');

    if (!cartItemsContainer || !totalPriceElement) {
        console.error("Required DOM elements not found: cartItemsContainer or totalPriceElement missing");
        return;
    }

    cartItemsContainer.innerHTML = '';
    let totalPrice = 0;

    if (!orderData.cartItems || !Array.isArray(orderData.cartItems) || orderData.cartItems.length === 0) {
        console.warn('No cart items found in orderData:', orderData);
        cartItemsContainer.innerHTML = '<p class="error-message">Không có sản phẩm nào trong đơn hàng.</p>';
        totalPriceElement.innerText = '0 VND';
        return;
    }

    orderData.cartItems.forEach((item, index) => {
        if (!item.name || !item.price) {
            console.warn(`Skipping invalid cart item at index ${index}:`, item);
            return;
        }

        const salePrice = typeof item.price === 'string'
            ? parseInt(item.price.replace(/[^0-9]/g, ''), 10) || 0
            : Math.floor(item.price) || 0;
        const originalPrice = typeof item.originalPrice === 'string'
            ? parseInt(item.originalPrice.replace(/[^0-9]/g, ''), 10) || 0
            : Math.floor(item.originalPrice) || 0;

        const itemHtml = `
            <div class="cart-item">
                <div class="cart-image-container">
                    <img src="${item.image || 'fallback-image.jpg'}" alt="${item.name || 'Unknown Product'}" onerror="this.src='fallback-image.jpg'; console.error('Image failed to load:', '${item.image}')">
                </div>
                <div class="cart-Items">
                    <div class="content">
                        <span class="item">${item.name || 'Unknown Product'}</span>
                        <div class="price">
                            <span class="sale-price">${formatVND(salePrice)} VND</span>
                            <span class="original-price line-through">${item.originalPrice ? formatVND(originalPrice) : 'N/A'} VND</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        cartItemsContainer.innerHTML += itemHtml;
        totalPrice += salePrice * (item.quantity || 1);
    });

    totalPriceElement.innerText = `${formatVND(totalPrice)} VND`;
}

function renderBreadcrumb() {
    const breadcrumbContainer = document.querySelector('.breadcrumb');
    if (!breadcrumbContainer) {
        console.warn('Breadcrumb container not found');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const brand = params.get('brand') ? decodeURIComponent(params.get('brand')).toLowerCase() : null;
    const category = params.get('category') ? decodeURIComponent(params.get('category')).toLowerCase() : null;
    const type = params.get('type') ? decodeURIComponent(params.get('type')).toLowerCase() : null;

    console.log("Updating breadcrumb - Brand:", brand, "Category:", category, "Type:", type);

    let breadcrumbText = '<a href="index.html">Homepage</a> / ';
    let href = 'product-page.html';
    let displayText = 'Sản phẩm';

    if (brand && brand !== 'all') {
        // Use the title-cased brand name from brandMap for the URL and display
        const brandDisplay = brandMap[brand] || brand.charAt(0).toUpperCase() + brand.slice(1);
        href += `?brand=${encodeURIComponent(brandMap[brand] || brandDisplay)}`;

        if (type && type !== 'all') {
            // When both brand and type are present, make brand and type clickable
            const typeDisplay = typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
            const typeHref = `product-page.html?brand=${encodeURIComponent(brandMap[brand] || brandDisplay)}&type=${encodeURIComponent(typeMap[type] || typeDisplay)}`;
            breadcrumbText += `<a href="${href}">${brandDisplay}</a> / <a href="${typeHref}">${typeDisplay}</a>`;
        } else {
            // Only brand is present, make it clickable to the current brand page
            breadcrumbText += `<a href="${href}">${brandDisplay}</a>`;
        }
    } else if (category) {
        // Handle category case, make it clickable to the category page
        href += `?category=${encodeURIComponent(category)}`;
        displayText = category === 'mới nhất' ? 'Sản phẩm mới' : typeMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
        breadcrumbText += `<a href="${href}">${displayText}</a>`;
    } else {
        // Default case, make "Sản phẩm" clickable to the product page
        breadcrumbText += `<a href="${href}">${displayText}</a>`;
    }

    breadcrumbContainer.innerHTML = breadcrumbText;
    console.log('Breadcrumb rendered:', breadcrumbText);
}

// Modal functions
function closeModal() {
    const modal = document.getElementById('cartModal');
    if (modal) modal.style.display = 'none';
}

function contactZalo() {
    window.open('https://zalo.me/', '_blank');
}

function checkout() {
    console.log("Navigating to checkout.html with cart items:", cartItems);
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    window.location.href = 'checkout.html';
}

async function submitOrder(orderData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });

        const result = await response.json();
        if (response.ok) {
            console.log("Order submitted successfully:", result);
            window.location.href = 'confirmation.html';
        } else {
            console.error("Failed to submit order:", result.message);
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error("Error submitting order:", error);
        alert("An error occurred while submitting your order. Please try again.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const expandableSections = document.querySelectorAll('.expandable');

    expandableSections.forEach(section => {
        const title = section.querySelector('.content-wrapper');
        const content = section.querySelector('.section-content');
        const arrow = section.querySelector('.arrow');

        title.addEventListener('click', () => {
            content.classList.toggle('active');
            if (arrow) {
                arrow.classList.toggle('rotated');
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const showProductsButton = document.getElementById('showProducts');

    showProductsButton.addEventListener('click', () => {
        const hiddenItems = document.querySelectorAll(".new-arrivals-container a:nth-child(n+5)");

        hiddenItems.forEach(item => {
            item.style.display = item.style.display === "flex" ? "none" : "flex";
        });

        showProductsButton.style.display = 'none'; // Hide the button
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const showNewsButton = document.getElementById('showNews');

    showNewsButton.addEventListener('click', () => {
        const hiddenNewsItems = document.querySelectorAll(".news-item:nth-child(n+5)");

        hiddenNewsItems.forEach(item => {
            item.style.display = item.style.display === "block" ? "none" : "block";
        });

        showNewsButton.style.display = 'none'; // Hide the button
    });
});


function setupHeaderScroll() {
    const logoMenu = document.querySelector('.logo-and-menu');
    const navIcons = document.querySelectorAll('.nav-icons .icon');
    const menuSpan = document.querySelector('.menu-span');
    const brandText = document.querySelector('.brand');
    const cartBadge = document.querySelector('.shopping-bag .cart-badge');

    // Check if critical element exists
    if (!logoMenu) {
        console.warn('Element with class .logo-and-menu not found. Skipping setupHeaderScroll.');
        return;
    }

    // Log warnings for other missing elements
    if (navIcons.length === 0) console.warn('No elements with class .nav-icons .icon found');
    if (!menuSpan) console.warn('Element with class .menu-span not found');
    if (!brandText) console.warn('Element with class .brand not found');
    if (!cartBadge) console.log('No cart badge found (normal if cart is empty)');

    // Define image source mappings
    const imageSources = {
        'shopping-bag': {
            original: 'img/white-shopping-bar.png',
            alternate: 'img/shoppingbag.png'
        },
        'search': {
            original: 'img/white-search-bar.png',
            alternate: 'img/searchbar.png'
        },
        'menu': {
            original: 'img/white-hamburger-menu.png',
            alternate: 'img/hamburger-menu.png'
        }
    };

    // Store initial padding of logoMenu
    const initialPadding = window.getComputedStyle(logoMenu).padding || '15px 18%';

    // Check if viewport is mobile (600px or less)
    const isMobile = () => window.innerWidth <= 600;

    // Handle scroll event
    function handleScroll() {
        const scrolled = window.scrollY > 50;

        // Update background and transition
        logoMenu.style.backgroundColor = scrolled ? 'white' : 'transparent';
        logoMenu.style.padding = isMobile()
            ? (scrolled ? '20px 10px' : '15px 10px') // No left/right padding on mobile
            : (scrolled ? '15px 10%' : initialPadding);
        logoMenu.style.transition = 'background-color 0.3s ease, padding 0.3s ease';

        // Update menu text color
        if (menuSpan) {
            menuSpan.style.color = scrolled ? 'black' : 'white';
            menuSpan.style.transition = 'color 0.3s ease';
        }

        // Update brand text color
        if (brandText) {
            brandText.style.color = scrolled ? 'black' : 'white';
            brandText.style.transition = 'color 0.3s ease';
        }

        // Update icon sources
        navIcons.forEach(icon => {
            const parentLi = icon.closest('li');
            if (parentLi) {
                const className = parentLi.classList[0];
                if (imageSources[className]) {
                    icon.src = scrolled ? imageSources[className].alternate : imageSources[className].original;
                    icon.style.transition = 'opacity 0.3s ease';
                } else {
                    console.warn(`No image source defined for class: ${className}`);
                }
            }
        });

        // Update cart badge color
        if (cartBadge) {
            cartBadge.style.color = scrolled ? 'black' : 'white';
            cartBadge.style.transition = 'color 0.3s ease';
        }
    }

    // Initialize scroll listener
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll); // Update on resize
    console.log('Header scroll listener added');

    // Initial call to set correct state on page load
    handleScroll();
}

function setupHeaderSlide() {
    const headerContainer = document.querySelector('.header-container');
    const header = document.querySelector('.header');
    let lastScrollY = window.scrollY;
    let isHeaderVisible = true;

    if (!headerContainer || !header) {
        console.warn('Header container or header not found');
        return;
    }

    const headerHeight = header.offsetHeight;

    function handleScroll() {
        const currentScrollY = window.scrollY;
        const scrollingDown = currentScrollY > lastScrollY && currentScrollY > 50;

        if (scrollingDown && isHeaderVisible) {
            // Slide up header-container by header height
            headerContainer.style.transform = `translateY(-${headerHeight}px)`;
            isHeaderVisible = false;
        } else if (currentScrollY <= 10 && !isHeaderVisible) {
            // Slide down header-container only when near the top
            headerContainer.style.transform = 'translateY(0)';
            isHeaderVisible = true;
        }

        lastScrollY = currentScrollY;
    }

    // Initialize scroll listener
    window.addEventListener('scroll', handleScroll);

    // Initial call to set correct state on page load
    handleScroll();
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Initializing page:", window.location.pathname);
    initializeSidebar();
    initializeServicesScroll();
    initializeColumnToggle();
    updateCartCount();

    const products = await fetchProducts();
    setupSearch(products);
    setupCustomNav(products);
    updateHeadingFromURL();
    renderProductDetails();
    renderBreadcrumb();

    const params = new URLSearchParams(window.location.search);
    const newsId = params.get('newsId');

    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
        renderProducts(products, "new-arrivals", 0, 5);
        renderProducts(products, "our-collection", 0, 10);
        const news = await fetchNews();
        renderNews(news, "newsGrid", 0);
    } else if (window.location.pathname.includes("news-page.html")) {
        const news = await fetchNews();
        renderNews(news, "newsGrid", 0);
        setupPagination();
    } else if (window.location.pathname.includes("news-details.html")) {
        const newsContent = document.getElementById('news-content');
        const newsTitle = document.querySelector('.news-title');
        const backButton = document.getElementById('back-to-news');
        
        if (!newsContent || !newsTitle) {
            console.error('Required DOM elements not found:', {
                newsContent: !!newsContent,
                newsTitle: !!newsTitle
            });
            newsContent.innerHTML = `<p class="text-red-600 text-center">Error: Page elements missing.</p>`;
            return;
        }

        if (!newsId) {
            console.error('No newsId provided in URL');
            newsContent.innerHTML = `<p class="text-red-600 text-center">No news article specified.</p>`;
            return;
        }

        console.log('Fetching news article for newsId:', newsId);
        const newsItem = await fetchNewsById(newsId);
        console.log('Fetched news item:', newsItem);

        if (newsItem.error || !newsItem || !newsItem.content) {
            console.error('Failed to fetch news item or invalid data:', newsItem.error || 'No content available');
            newsContent.innerHTML = `<p class="text-red-600 text-center">Error loading news article. Please try again later.</p>`;
            return;
        }

        // Sanitize and render content
        newsContent.innerHTML = newsItem.content;
        newsTitle.textContent = newsItem.title || 'Tin tức';
        newsTitle.scrollIntoView({ behavior: 'smooth' });

        // Update breadcrumb to reflect article title
        const breadcrumbSpan = document.querySelector('.breadcrumb span');
        if (breadcrumbSpan) {
            breadcrumbSpan.textContent = newsItem.title || 'Bài viết';
        }

        if (backButton) {
            backButton.addEventListener('click', () => {
                console.log('Back to news clicked');
                window.location.href = 'news-page.html';
            });
        } else {
            console.warn('Back button not found');
        }
    } else if (window.location.pathname.includes("product-details.html")) {
        renderProducts(products, "suggestion", 0);
    } else if (window.location.pathname.includes("product-page.html")) {
        const brand = params.get('brand');
        if (brand) {
            const filteredProducts = products.filter(product =>
                product.brand.toLowerCase() === brand.toLowerCase() ||
                brandMap[product.brand.toLowerCase()]?.toLowerCase() === brand.toLowerCase()
            );
            renderProducts(filteredProducts, "all-products");
        } else {
            renderProducts(products, "all-products");
        }
        updateHeadingFromURL();
    } else if (window.location.pathname.includes("checkout.html")) {
        renderProductCheckout();
        setupPaymentMethodToggle();
        setupFormSubmission();
    } else if (window.location.pathname.includes("confirmation.html")) {
        renderConfirmationPage();
    }

    await setupBrandFilters(products);

    window.addEventListener('popstate', () => {
        console.log("URL changed, updating heading");
        updateHeadingFromURL();
        const params = new URLSearchParams(window.location.search);
        const brand = params.get('brand');
        if (brand) {
            const filteredProducts = products.filter(product =>
                product.brand.toLowerCase() === brand.toLowerCase() ||
                brandMap[product.brand.toLowerCase()]?.toLowerCase() === brand.toLowerCase()
            );
            renderProducts(filteredProducts, "all-products");
        } else {
            renderProducts(products, "all-products");
        }
    });

    document.querySelectorAll('.zalo-contact').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            window.open('https://zalo.me/', '_blank');
        });
    });

    const shoppingBagIcon = document.querySelector('.shopping-bag');
    if (shoppingBagIcon) {
        shoppingBagIcon.addEventListener('click', () => {
            const modal = document.getElementById('cartModal');
            if (modal) {
                modal.style.display = 'flex';
                displayCartItems();
            }
        });
    }

    const closeButton = document.querySelector('.close-btn');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            const modal = document.getElementById('cartModal');
            if (modal) modal.style.display = 'none';
        });
    }

    const cartModal = document.getElementById('cartModal');
    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) cartModal.style.display = 'none';
        });
    }

    const pagesWithHeader = ['index.html', 'product-page.html', 'product-details.html', 'news-page.html', 'news-details.html', '/'];
    if (pagesWithHeader.some(page => window.location.pathname.includes(page) || window.location.pathname === page)) {
        console.log("Setting up header scroll and slide");
        setupHeaderScroll();
        setupHeaderSlide();
    } else {
        console.log("Skipping header setup on this page");
    }
});