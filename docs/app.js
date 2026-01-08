const CONFIG = {
  sheetId: "1tLdiGfhlSR0jsXT89jk-dDGfhci-Y3IAiECoR2g5RCo",
  driveFolderId: "1Q7mcMtEQoccD5gfux4TXNi9zY9qnIiXf",
  appsScriptUrl: "https://script.google.com/macros/s/REPLACE_ME/exec",
  appsScriptToken: "REPLACE_ME",
};

const defaultState = {
  currentUser: null,
  users: [
    {
      id: "u_admin",
      name: "Administrador",
      username: "admin",
      password: "Sami123+",
      role: "admin",
    },
  ],
  clients: [],
  projects: [],
  expenses: [],
  currentView: "caja",
};

let state = structuredClone(defaultState);

const sheetIdEl = document.getElementById("sheet-id");
const driveFolderEl = document.getElementById("drive-folder");
const sheetStatusEl = document.getElementById("sheet-status");
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const logoutButton = document.getElementById("logout-button");
const userSummary = document.getElementById("user-summary");
const balancesEl = document.getElementById("balances");
const expenseForm = document.getElementById("expense-form");
const expenseClient = document.getElementById("expense-client");
const expenseProject = document.getElementById("expense-project");
const expenseCity = document.getElementById("expense-city");
const expenseWarning = document.getElementById("expense-warning");
const expenseMessage = document.getElementById("expense-message");
const expenseTable = document.getElementById("expense-table");
const adminSection = document.getElementById("admin-section");
const expenseSheet = document.getElementById("expense-sheet");
const fabButton = document.getElementById("fab-button");
const appTitle = document.getElementById("app-title");
const menuToggle = document.getElementById("menu-toggle");
const drawer = document.getElementById("drawer");
const drawerClose = document.getElementById("drawer-close");
const drawerOverlay = document.getElementById("drawer-overlay");
const bottomNav = document.getElementById("bottom-nav");
const bottomNavItems = document.querySelectorAll(".bottom-nav__item");
const drawerNavItems = document.querySelectorAll(".drawer__item[data-view]");
const views = document.querySelectorAll(".view");

const userForm = document.getElementById("user-form");
const userMessage = document.getElementById("user-message");
const clientForm = document.getElementById("client-form");
const clientMessage = document.getElementById("client-message");
const projectForm = document.getElementById("project-form");
const projectMessage = document.getElementById("project-message");
const projectClient = document.getElementById("project-client");

const expenseReceipt = document.getElementById("expense-receipt");

sheetStatusEl.classList.add("status-message");
sheetIdEl.textContent = CONFIG.sheetId;
const folderUrl = `https://drive.google.com/drive/folders/${CONFIG.driveFolderId}`;
const folderLink = document.createElement("a");
folderLink.href = folderUrl;
folderLink.textContent = CONFIG.driveFolderId;
folderLink.target = "_blank";
folderLink.rel = "noreferrer";
folderLink.className = "link";

driveFolderEl.append(folderLink);

function getSheetStatusLabel() {
  if (!CONFIG.appsScriptUrl || !CONFIG.appsScriptToken) {
    return "Falta configurar Apps Script";
  }
  return "Conectado a Google Sheets";
}

function setStatusMessage(target, message, variant) {
  if (!target) {
    return;
  }
  target.textContent = message;
  target.classList.remove("is-error", "is-success", "is-loading");
  if (variant) {
    target.classList.add(`is-${variant}`);
  }
}

function getAuthHeaders() {
  const headers = {};
  if (CONFIG.appsScriptToken) {
    headers.Authorization = `Bearer ${CONFIG.appsScriptToken}`;
  }
  return headers;
}

async function readStateFromSheet() {
  if (!CONFIG.appsScriptUrl || !CONFIG.appsScriptToken) {
    throw new Error("Apps Script no configurado.");
  }
  const response = await fetch(
    `${CONFIG.appsScriptUrl}?action=read&sheetId=${encodeURIComponent(CONFIG.sheetId)}`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    },
  );
  if (!response.ok) {
    throw new Error("No se pudo obtener información desde Sheets.");
  }
  return response.json();
}

async function writeStateToSheet() {
  if (!CONFIG.appsScriptUrl || !CONFIG.appsScriptToken) {
    return { ok: false, error: "Apps Script no configurado." };
  }
  try {
    const response = await fetch(CONFIG.appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        action: "write",
        sheetId: CONFIG.sheetId,
        state,
      }),
    });
    if (!response.ok) {
      throw new Error("No se pudo guardar en Sheets.");
    }
    return { ok: true };
  } catch (error) {
    console.error("Error guardando en Sheets", error);
    return { ok: false, error: "No se pudo guardar en Sheets." };
  }
}

async function refreshStateFromSheet() {
  setStatusMessage(sheetStatusEl, "Sincronizando con Sheets...", "loading");
  try {
    const data = await readStateFromSheet();
    state = {
      ...structuredClone(defaultState),
      ...data,
    };
    setStatusMessage(sheetStatusEl, "Datos sincronizados.", "success");
    updateView();
    return true;
  } catch (error) {
    console.error("Error cargando desde Sheets", error);
    setStatusMessage(sheetStatusEl, "Error al conectar con Sheets.", "error");
    updateView();
    return false;
  }
}

async function saveStateToSheet() {
  const result = await writeStateToSheet();
  if (!result.ok) {
    setStatusMessage(sheetStatusEl, result.error || "Error al guardar en Sheets.", "error");
  }
  return result.ok;
}

async function persistAndRefresh(messageEl, successMessage) {
  setStatusMessage(messageEl, "Guardando en Sheets...", "loading");
  const saved = await saveStateToSheet();
  if (!saved) {
    setStatusMessage(messageEl, "No se pudo guardar en Sheets.", "error");
    return false;
  }
  const refreshed = await refreshStateFromSheet();
  if (refreshed) {
    setStatusMessage(messageEl, successMessage, "success");
    return true;
  }
  setStatusMessage(messageEl, "Guardado local, pero sin sincronizar.", "error");
  return false;
}

function updateView() {
  const isLoggedIn = Boolean(state.currentUser);
  loginSection.classList.toggle("hidden", isLoggedIn);
  appSection.classList.toggle("hidden", !isLoggedIn);
  drawer.classList.toggle("hidden", !isLoggedIn);
  fabButton.classList.toggle("hidden", !isLoggedIn);
  bottomNav.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    toggleDrawer(false);
    return;
  }

  if (
    !sheetStatusEl.classList.contains("is-loading")
    && !sheetStatusEl.classList.contains("is-success")
    && !sheetStatusEl.classList.contains("is-error")
  ) {
    setStatusMessage(sheetStatusEl, getSheetStatusLabel());
  }
  userSummary.textContent = `${state.currentUser.name} · Rol ${state.currentUser.role}`;
  adminSection.classList.toggle("hidden", state.currentUser.role !== "admin");

  renderOptions();
  renderBalances();
  renderExpenses();
  updateExpenseAvailability();
  setActiveView(state.currentView || "caja");
}

function setActiveView(viewName) {
  state.currentView = viewName;
  void saveStateToSheet();

  views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === viewName);
  });

  bottomNavItems.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });

  drawerNavItems.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });

  const titleMap = {
    caja: "Caja menor",
    egresos: "Egresos",
    ingresos: "Usuarios",
    usuarios: "Usuarios",
  };
  appTitle.textContent = titleMap[viewName] || "Gastos Ingeniería";

  const showFab = viewName === "egresos";
  fabButton.classList.toggle("hidden", !showFab);
  if (!showFab) {
    expenseSheet.classList.remove("is-visible");
  }
}

function renderOptions() {
  renderSelect(expenseClient, state.clients, "Seleccione un cliente");
  renderSelect(projectClient, state.clients, "Seleccione un cliente");
  const selectedClientId = expenseClient.value;
  const projects = state.projects.filter((project) => project.clientId === selectedClientId);
  renderSelect(expenseProject, projects, "Seleccione un proyecto", (item) => item.name);
  const selectedProject = state.projects.find((project) => project.id === expenseProject.value);
  expenseCity.value = selectedProject?.city || "";
}

function renderSelect(selectEl, items, placeholder, getLabel) {
  selectEl.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = placeholder;
  selectEl.append(empty);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = getLabel ? getLabel(item) : item.name;
    selectEl.append(option);
  });
}

function calculateProjectBalance(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) {
    return 0;
  }
  const spent = state.expenses
    .filter((expense) => expense.projectId === projectId)
    .reduce((total, expense) => total + expense.amount, 0);
  return project.baseAmount - spent;
}

function renderBalances() {
  balancesEl.innerHTML = "";
  if (!state.projects.length) {
    balancesEl.innerHTML = "<p class=\"form__helper\">Aún no hay cajas creadas.</p>";
    return;
  }
  state.projects.forEach((project) => {
    const remaining = calculateProjectBalance(project.id);
    const status = remaining > 0 ? "Abierta" : "Cerrada";
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item__header">
        <span>${project.clientName}</span>
        <span class="status">${status}</span>
      </div>
      <div class="list-item__meta">$${remaining.toLocaleString()}</div>
      <div class="list-item__meta">${project.name} · ${project.city}</div>
    `;
    balancesEl.append(item);
  });
}

function updateExpenseAvailability() {
  const projectId = expenseProject.value;
  const remaining = projectId ? calculateProjectBalance(projectId) : null;
  if (remaining !== null && remaining <= 0) {
    expenseWarning.textContent = "La caja está en $0. No es posible registrar más egresos.";
    expenseWarning.classList.add("is-visible");
  } else {
    expenseWarning.textContent = "";
    expenseWarning.classList.remove("is-visible");
  }

  const isBlocked = remaining !== null && remaining <= 0;
  expenseForm.querySelector("button").disabled = isBlocked;
}

function renderExpenses() {
  if (!state.expenses.length) {
    expenseTable.innerHTML = "<p class=\"form__helper\">No hay egresos registrados.</p>";
    return;
  }
  const rows = [...state.expenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((expense) => {
      return `
        <div class="list-item">
          <div class="list-item__header">
            <span>${expense.category}</span>
            <span>$${expense.amount.toLocaleString()}</span>
          </div>
          <div class="list-item__meta">${expense.date} · ${expense.projectName}</div>
          <div class="list-item__meta">${expense.clientName} · ${expense.description}</div>
        </div>
      `;
    })
    .join("");

  expenseTable.innerHTML = rows;
}

function toggleDrawer(forceOpen) {
  const shouldOpen = forceOpen ?? !drawer.classList.contains("is-visible");
  drawer.classList.toggle("is-visible", shouldOpen);
  drawerOverlay.classList.toggle("is-visible", shouldOpen);
  drawer.setAttribute("aria-hidden", (!shouldOpen).toString());
  drawerOverlay.setAttribute("aria-hidden", (!shouldOpen).toString());
  menuToggle.classList.toggle("is-active", shouldOpen);
  menuToggle.setAttribute("aria-expanded", shouldOpen.toString());
  document.body.classList.toggle("is-locked", shouldOpen);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const found = state.users.find((user) => user.username === username && user.password === password);

  if (!found) {
    setStatusMessage(loginMessage, "Credenciales inválidas.", "error");
    return;
  }

  state.currentUser = { ...found };
  const saved = await saveStateToSheet();
  if (!saved) {
    setStatusMessage(loginMessage, "No se pudo sincronizar la sesión.", "error");
    return;
  }
  setStatusMessage(loginMessage, "", "");
  loginForm.reset();
  updateView();
});

logoutButton.addEventListener("click", async () => {
  state.currentUser = null;
  await saveStateToSheet();
  updateView();
});

bottomNavItems.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.view);
  });
});

drawerNavItems.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.view);
    toggleDrawer(false);
  });
});

menuToggle.addEventListener("click", () => {
  toggleDrawer();
});

drawerClose.addEventListener("click", () => {
  toggleDrawer(false);
});

drawerOverlay.addEventListener("click", () => {
  toggleDrawer(false);
});

fabButton.addEventListener("click", () => {
  expenseSheet.classList.toggle("is-visible");
});

expenseClient.addEventListener("change", () => {
  renderOptions();
  updateExpenseAvailability();
});

expenseProject.addEventListener("change", () => {
  renderOptions();
  updateExpenseAvailability();
});

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const projectId = expenseProject.value;
  const remaining = calculateProjectBalance(projectId);
  if (remaining <= 0) {
    setStatusMessage(expenseMessage, "La caja está en $0. No se puede registrar el egreso.", "error");
    return;
  }

  const receiptFile = expenseReceipt.files[0];
  if (!receiptFile) {
    setStatusMessage(expenseMessage, "Debe adjuntar una foto del comprobante.", "error");
    return;
  }

  const client = state.clients.find((item) => item.id === expenseClient.value);
  const project = state.projects.find((item) => item.id === projectId);

  const newExpense = {
    id: `exp_${crypto.randomUUID()}`,
    date: document.getElementById("expense-date").value,
    category: document.getElementById("expense-category").value.trim(),
    description: document.getElementById("expense-description").value.trim(),
    amount: Number(document.getElementById("expense-amount").value),
    receiptName: receiptFile.name,
    clientId: client?.id,
    clientName: client?.name ?? "",
    projectId: project?.id,
    projectName: project?.name ?? "",
    city: project?.city ?? "",
    createdAt: new Date().toISOString(),
  };

  if (newExpense.amount > remaining) {
    setStatusMessage(expenseMessage, "El valor supera el saldo disponible en la caja.", "error");
    return;
  }

  state.expenses.push(newExpense);
  const synced = await persistAndRefresh(expenseMessage, "Egreso registrado correctamente.");
  if (synced) {
    expenseForm.reset();
    renderBalances();
    renderExpenses();
    updateExpenseAvailability();
  }
});

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("user-name").value.trim();
  const username = document.getElementById("user-username").value.trim();
  const password = document.getElementById("user-password").value.trim();
  const role = document.getElementById("user-role").value;

  if (state.users.some((user) => user.username === username)) {
    setStatusMessage(userMessage, "El usuario ya existe.", "error");
    return;
  }

  state.users.push({
    id: `user_${crypto.randomUUID()}`,
    name,
    username,
    password,
    role,
  });
  const synced = await persistAndRefresh(userMessage, "Usuario creado.");
  if (synced) {
    userForm.reset();
  }
});

clientForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("client-name").value.trim();
  const city = document.getElementById("client-city").value.trim();

  if (!name || !city) {
    setStatusMessage(clientMessage, "Complete todos los campos.", "error");
    return;
  }

  state.clients.push({
    id: `client_${crypto.randomUUID()}`,
    name,
    city,
  });
  const synced = await persistAndRefresh(clientMessage, "Cliente creado.");
  if (synced) {
    clientForm.reset();
    renderOptions();
  }
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const clientId = projectClient.value;
  const client = state.clients.find((item) => item.id === clientId);
  const name = document.getElementById("project-name").value.trim();
  const baseAmount = Number(document.getElementById("project-base").value);

  if (!client) {
    setStatusMessage(projectMessage, "Seleccione un cliente válido.", "error");
    return;
  }

  state.projects.push({
    id: `project_${crypto.randomUUID()}`,
    clientId: client.id,
    clientName: client.name,
    city: client.city,
    name,
    baseAmount,
  });
  const synced = await persistAndRefresh(projectMessage, "Proyecto creado.");
  if (synced) {
    projectForm.reset();
    renderOptions();
    renderBalances();
  }
});

async function initApp() {
  setStatusMessage(sheetStatusEl, getSheetStatusLabel());
  await refreshStateFromSheet();
}

initApp();
