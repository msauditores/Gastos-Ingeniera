const CONFIG = {
  sheetId: "1tLdiGfhlSR0jsXT89jk-dDGfhci-Y3IAiECoR2g5RCo",
  driveFolderId: "1Q7mcMtEQoccD5gfux4TXNi9zY9qnIiXf",
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbyLadJHX4HcnS6uDYP27btoPgFjqih8qLXgcV8okoaW_g7dtuL9rsRoSP3jsrT_UI_5SA/exec",
  appsScriptToken: "Fondo-2026!X9k2$",
};

const STORAGE_KEY = "gastos-ingenieria-state";

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
  concepts: ["Transporte", "Alimentación", "Materiales", "Servicios"],
  supports: ["Factura", "Recibo", "Comprobante", "Otro"],
  currentView: "dashboard",
};

let state = loadState();

const sheetIdEl = document.getElementById("sheet-id");
const driveFolderEl = document.getElementById("drive-folder");
const sheetStatusEl = document.getElementById("sheet-status");
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const logoutButton = document.getElementById("logout-button");
const userSummary = document.getElementById("user-summary");
const navButtons = document.querySelectorAll(".nav__item");
const views = document.querySelectorAll(".view");
const usersNav = document.getElementById("users-nav");
const viewTitle = document.getElementById("view-title");
const viewSubtitle = document.getElementById("view-subtitle");
const viewEyebrow = document.getElementById("view-eyebrow");
const syncButton = document.getElementById("sync-button");

const statClients = document.getElementById("stat-clients");
const statProjects = document.getElementById("stat-projects");
const statBase = document.getElementById("stat-base");
const statRemaining = document.getElementById("stat-remaining");

const balancesEl = document.getElementById("balances");
const recentExpensesEl = document.getElementById("recent-expenses");

const clientForm = document.getElementById("client-form");
const clientMessage = document.getElementById("client-message");
const clientList = document.getElementById("client-list");

const projectForm = document.getElementById("project-form");
const projectMessage = document.getElementById("project-message");
const projectClient = document.getElementById("project-client");
const projectList = document.getElementById("project-list");

const expenseForm = document.getElementById("expense-form");
const expenseClient = document.getElementById("expense-client");
const expenseProject = document.getElementById("expense-project");
const expenseCity = document.getElementById("expense-city");
const expenseRemaining = document.getElementById("expense-remaining");
const expenseCategory = document.getElementById("expense-category");
const expenseSupport = document.getElementById("expense-support");
const expenseWarning = document.getElementById("expense-warning");
const expenseMessage = document.getElementById("expense-message");
const expenseTable = document.getElementById("expense-table");
const receiptInput = document.getElementById("expense-receipt");
const receiptPreview = document.getElementById("receipt-preview");

const userForm = document.getElementById("user-form");
const userMessage = document.getElementById("user-message");
const userList = document.getElementById("user-list");
const adminSection = document.getElementById("admin-section");
const projectCodeInput = document.getElementById("project-code");
const projectCityInput = document.getElementById("project-city");

const folderUrl = `https://drive.google.com/drive/folders/${CONFIG.driveFolderId}`;

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return structuredClone(defaultState);
  }
  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      currentUser: null,
    };
  } catch (error) {
    console.error("Error leyendo el estado local", error);
    return structuredClone(defaultState);
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function getSheetStatusLabel() {
  if (!CONFIG.appsScriptUrl || !CONFIG.appsScriptToken) {
    return "Modo local · Configura Apps Script para sincronizar";
  }
  return "Conectado a Google Sheets";
}

function updateHeader(viewName) {
  const headerMap = {
    dashboard: {
      eyebrow: "Panel general",
      title: "Resumen operativo",
      subtitle: "Visualiza el estado de las cajas menores y los últimos egresos registrados.",
    },
    clients: {
      eyebrow: "Clientes",
      title: "Gestión de clientes",
      subtitle: "Registra nuevas empresas y controla sus proyectos asociados.",
    },
    projects: {
      eyebrow: "Proyectos",
      title: "Cajas menores por proyecto",
      subtitle: "Asigna códigos, ciudades y bases iniciales a cada proyecto.",
    },
    expenses: {
      eyebrow: "Egresos",
      title: "Registro de gastos",
      subtitle: "Adjunta el soporte fotográfico y controla el saldo disponible.",
    },
    users: {
      eyebrow: "Usuarios",
      title: "Administración de usuarios",
      subtitle: "Define accesos y roles dentro del aplicativo.",
    },
  };
  const config = headerMap[viewName] || headerMap.dashboard;
  viewEyebrow.textContent = config.eyebrow;
  viewTitle.textContent = config.title;
  viewSubtitle.textContent = config.subtitle;
}

function setActiveView(viewName) {
  state.currentView = viewName;
  persistState();
  views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === viewName);
  });
  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });
  updateHeader(viewName);
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

function renderSelect(selectEl, items, placeholder, getLabel, selectedId) {
  if (!selectEl) {
    return;
  }
  selectEl.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = placeholder;
  selectEl.append(empty);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = getLabel ? getLabel(item) : item.name;
    if (selectedId && option.value === selectedId) {
      option.selected = true;
    }
    selectEl.append(option);
  });
}

function renderClients() {
  clientList.innerHTML = "";
  if (!state.clients.length) {
    clientList.innerHTML = '<p class="form__helper">Aún no hay clientes registrados.</p>';
    return;
  }
  state.clients.forEach((client) => {
    const projectCount = state.projects.filter((project) => project.clientId === client.id).length;
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item__header">
        <span>${client.name}</span>
        <span>${projectCount} proyectos</span>
      </div>
      <div class="list-item__meta">${client.city}</div>
      ${client.contact ? `<div class="list-item__meta">${client.contact}</div>` : ""}
    `;
    clientList.append(item);
  });
}

function renderProjects() {
  projectList.innerHTML = "";
  if (!state.projects.length) {
    projectList.innerHTML = '<p class="form__helper">Aún no hay proyectos registrados.</p>';
    return;
  }
  state.projects.forEach((project) => {
    const remaining = calculateProjectBalance(project.id);
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item__header">
        <span>${project.code} · ${project.name}</span>
        <span>$${remaining.toLocaleString()}</span>
      </div>
      <div class="list-item__meta">${project.clientName} · ${project.city}</div>
      <div class="list-item__meta">Base inicial: $${project.baseAmount.toLocaleString()}</div>
    `;
    projectList.append(item);
  });
}

function renderBalances() {
  balancesEl.innerHTML = "";
  if (!state.projects.length) {
    balancesEl.innerHTML = '<p class="form__helper">Aún no hay cajas creadas.</p>';
    return;
  }
  state.projects.forEach((project) => {
    const remaining = calculateProjectBalance(project.id);
    const status = remaining > 0 ? "Activa" : "Cerrada";
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item__header">
        <span>${project.clientName}</span>
        <span>${status}</span>
      </div>
      <div class="list-item__meta">Proyecto ${project.code} · ${project.name}</div>
      <div class="list-item__meta">${project.city} · Saldo $${remaining.toLocaleString()}</div>
    `;
    balancesEl.append(item);
  });
}

function renderExpenses() {
  expenseTable.innerHTML = "";
  if (!state.expenses.length) {
    expenseTable.innerHTML = '<p class="form__helper">No hay egresos registrados.</p>';
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
          <div class="list-item__meta">Soporte: ${expense.supportType || "Sin definir"}</div>
          <div class="list-item__meta">
            Comprobante: ${
              expense.receiptUrl
                ? `<a class="link" href="${expense.receiptUrl}" target="_blank" rel="noreferrer">${expense.receiptName}</a>`
                : expense.receiptName || "Sin archivo"
            }
          </div>
        </div>
      `;
    })
    .join("");
  expenseTable.innerHTML = rows;
}

function renderRecentExpenses() {
  recentExpensesEl.innerHTML = "";
  if (!state.expenses.length) {
    recentExpensesEl.innerHTML = '<p class="form__helper">No hay egresos registrados.</p>';
    return;
  }
  const rows = [...state.expenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4)
    .map((expense) => {
      return `
        <div class="list-item">
          <div class="list-item__header">
            <span>${expense.category}</span>
            <span>$${expense.amount.toLocaleString()}</span>
          </div>
          <div class="list-item__meta">${expense.projectName} · ${expense.clientName}</div>
          <div class="list-item__meta">${expense.date}</div>
        </div>
      `;
    })
    .join("");
  recentExpensesEl.innerHTML = rows;
}

function renderUsers() {
  userList.innerHTML = "";
  if (!state.users.length) {
    userList.innerHTML = '<p class="form__helper">No hay usuarios registrados.</p>';
    return;
  }
  state.users.forEach((user) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="list-item__header">
        <span>${user.name}</span>
        <span>${user.role}</span>
      </div>
      <div class="list-item__meta">Usuario: ${user.username}</div>
    `;
    userList.append(item);
  });
}

function updateExpenseAvailability() {
  const projectId = expenseProject.value;
  const remaining = projectId ? calculateProjectBalance(projectId) : null;
  if (remaining !== null) {
    expenseRemaining.value = `$${remaining.toLocaleString()}`;
  } else {
    expenseRemaining.value = "";
  }

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

function renderStats() {
  statClients.textContent = state.clients.length;
  statProjects.textContent = state.projects.length;
  const totalBase = state.projects.reduce((sum, project) => sum + project.baseAmount, 0);
  const totalRemaining = state.projects.reduce(
    (sum, project) => sum + calculateProjectBalance(project.id),
    0,
  );
  statBase.textContent = `$${totalBase.toLocaleString()}`;
  statRemaining.textContent = `$${totalRemaining.toLocaleString()}`;
}

function renderOptions() {
  renderSelect(projectClient, state.clients, "Seleccione un cliente", null, projectClient.value);
  renderSelect(expenseClient, state.clients, "Seleccione un cliente", null, expenseClient.value);

  const selectedClientId = expenseClient.value;
  const projects = state.projects.filter((project) => project.clientId === selectedClientId);
  renderSelect(
    expenseProject,
    projects,
    "Seleccione un proyecto",
    (item) => `${item.code} · ${item.name}`,
    expenseProject.value,
  );

  const selectedProject = state.projects.find((project) => project.id === expenseProject.value);
  expenseCity.value = selectedProject?.city || "";
  updateExpenseAvailability();

  renderSimpleSelect(expenseCategory, state.concepts, "Seleccione una categoría");
  renderSimpleSelect(expenseSupport, state.supports, "Seleccione el soporte");
  updateProjectCodeSuggestion();
}

function updateView() {
  const isLoggedIn = Boolean(state.currentUser);
  loginSection.classList.toggle("hidden", isLoggedIn);
  appSection.classList.toggle("hidden", !isLoggedIn);
  document.getElementById("user-card").classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    return;
  }

  userSummary.textContent = `${state.currentUser.name} · ${state.currentUser.role}`;
  const isAdmin = state.currentUser.role === "admin";
  usersNav.classList.toggle("hidden", !isAdmin);
  adminSection.classList.toggle("hidden", !isAdmin);
  if (!isAdmin && state.currentView === "users") {
    state.currentView = "dashboard";
  }

  renderOptions();
  renderStats();
  renderBalances();
  renderProjects();
  renderClients();
  renderExpenses();
  renderRecentExpenses();
  renderUsers();

  setActiveView(state.currentView || "dashboard");
}

function renderSimpleSelect(selectEl, items, placeholder) {
  if (!selectEl) {
    return;
  }
  const selected = selectEl.value;
  selectEl.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = placeholder;
  selectEl.append(empty);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    if (selected && option.value === selected) {
      option.selected = true;
    }
    selectEl.append(option);
  });
}

function normalizeCodeSegment(text) {
  return text
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.slice(0, 2))
    .join("")
    .slice(0, 6);
}

function getNextProjectSequence(clientId, city) {
  const citySegment = normalizeCodeSegment(city);
  const matching = state.projects.filter(
    (project) => project.clientId === clientId && normalizeCodeSegment(project.city) === citySegment,
  );
  const maxSequence = matching.reduce((max, project) => {
    const match = project.code?.match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return String(maxSequence + 1).padStart(3, "0");
}

function getSuggestedProjectCode() {
  const clientId = projectClient.value;
  const client = state.clients.find((item) => item.id === clientId);
  const city = projectCityInput.value.trim();
  if (!client || !city) {
    return "";
  }
  const clientSegment = normalizeCodeSegment(client.name);
  const citySegment = normalizeCodeSegment(city);
  const sequence = getNextProjectSequence(client.id, city);
  if (!clientSegment || !citySegment) {
    return "";
  }
  return `${clientSegment}-${citySegment}-${sequence}`;
}

function updateProjectCodeSuggestion() {
  if (!projectCodeInput) {
    return;
  }
  const shouldUpdate = !projectCodeInput.value || projectCodeInput.dataset.auto === "true";
  if (!shouldUpdate) {
    return;
  }
  const suggested = getSuggestedProjectCode();
  if (suggested) {
    projectCodeInput.value = suggested;
    projectCodeInput.dataset.auto = "true";
  }
}

function markProjectCodeManual() {
  projectCodeInput.dataset.auto = "false";
}

function isSyncEnabled() {
  return Boolean(CONFIG.appsScriptUrl && CONFIG.appsScriptToken);
}

async function apiRequest(action, payload) {
  const body = new URLSearchParams({
    token: CONFIG.appsScriptToken,
    sheetId: CONFIG.sheetId,
    action,
    payload: JSON.stringify(payload ?? {}),
  });
  const response = await fetch(CONFIG.appsScriptUrl, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new Error(`Error en Apps Script: ${response.status}`);
  }

  return response.json();
}

async function syncFromSheets() {
  if (!isSyncEnabled()) {
    return;
  }
  setStatusMessage(sheetStatusEl, "Sincronizando con Google Sheets...", "loading");
  try {
    const data = await apiRequest("bootstrap");
    const resolveCollection = (incoming, fallback) =>
      Array.isArray(incoming) && incoming.length ? incoming : fallback;
    state = {
      ...state,
      users: resolveCollection(data.users, state.users),
      clients: resolveCollection(data.clients, state.clients),
      projects: resolveCollection(data.projects, state.projects),
      expenses: resolveCollection(data.expenses, state.expenses),
      concepts: resolveCollection(data.concepts, state.concepts),
      supports: resolveCollection(data.supports, state.supports),
    };
    persistState();
    setStatusMessage(sheetStatusEl, "Datos actualizados desde Google Sheets.", "success");
    updateView();
  } catch (error) {
    console.error("Error sincronizando con Google Sheets", error);
    setStatusMessage(sheetStatusEl, "No fue posible sincronizar con Google Sheets.", "error");
  }
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No fue posible leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function handleReceiptPreview(file) {
  receiptPreview.innerHTML = "";
  if (!file) {
    receiptPreview.textContent = "Sin archivo seleccionado";
    return;
  }
  const image = document.createElement("img");
  image.src = URL.createObjectURL(file);
  image.alt = "Vista previa del comprobante";
  const label = document.createElement("span");
  label.className = "file-preview__label";
  label.textContent = file.name;
  receiptPreview.append(image, label);
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const found = state.users.find((user) => user.username === username && user.password === password);

  if (!found) {
    setStatusMessage(loginMessage, "Credenciales inválidas.", "error");
    return;
  }

  state.currentUser = { ...found };
  setStatusMessage(loginMessage, "", "");
  loginForm.reset();
  persistState();
  updateView();
});

logoutButton.addEventListener("click", () => {
  state.currentUser = null;
  persistState();
  updateView();
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.classList.contains("hidden")) {
      return;
    }
    setActiveView(button.dataset.view);
  });
});

syncButton.addEventListener("click", () => {
  persistState();
  if (!isSyncEnabled()) {
    setStatusMessage(sheetStatusEl, "Datos guardados localmente.", "success");
    return;
  }
  syncFromSheets();
});

expenseClient.addEventListener("change", () => {
  renderOptions();
});

expenseProject.addEventListener("change", () => {
  renderOptions();
});

projectClient.addEventListener("change", () => {
  updateProjectCodeSuggestion();
});

projectCityInput.addEventListener("input", () => {
  updateProjectCodeSuggestion();
});

projectCodeInput.addEventListener("input", () => {
  markProjectCodeManual();
});

receiptInput.addEventListener("change", (event) => {
  handleReceiptPreview(event.target.files[0]);
});

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const projectId = expenseProject.value;
  const remaining = calculateProjectBalance(projectId);
  if (remaining <= 0) {
    setStatusMessage(expenseMessage, "La caja está en $0. No se puede registrar el egreso.", "error");
    return;
  }

  const receiptFile = receiptInput.files[0];
  if (!receiptFile) {
    setStatusMessage(expenseMessage, "Debe adjuntar una foto del comprobante.", "error");
    return;
  }

  const client = state.clients.find((item) => item.id === expenseClient.value);
  const project = state.projects.find((item) => item.id === projectId);
  const amount = Number(document.getElementById("expense-amount").value);

  if (amount > remaining) {
    setStatusMessage(expenseMessage, "El valor supera el saldo disponible en la caja.", "error");
    return;
  }

  let receiptUrl = "";
  if (isSyncEnabled()) {
    try {
      const encoded = await readFileAsDataUrl(receiptFile);
      const upload = await apiRequest("uploadReceipt", {
        name: receiptFile.name,
        mimeType: receiptFile.type,
        dataUrl: encoded,
        folderId: CONFIG.driveFolderId,
      });
      receiptUrl = upload?.url || "";
    } catch (error) {
      console.error("No fue posible subir el comprobante", error);
      setStatusMessage(expenseMessage, "No fue posible subir el comprobante a Drive.", "error");
      return;
    }
  }

  const newExpense = {
    id: `exp_${crypto.randomUUID()}`,
    date: document.getElementById("expense-date").value,
    category: expenseCategory.value,
    supportType: expenseSupport.value,
    description: document.getElementById("expense-description").value.trim(),
    amount,
    receiptName: receiptFile.name,
    receiptUrl,
    clientId: client?.id,
    clientName: client?.name ?? "",
    projectId: project?.id,
    projectName: project?.name ?? "",
    city: project?.city ?? "",
    createdAt: new Date().toISOString(),
  };

  state.expenses.push(newExpense);
  persistState();
  setStatusMessage(expenseMessage, "Egreso registrado correctamente.", "success");
  expenseForm.reset();
  expenseCategory.value = "";
  expenseSupport.value = "";
  handleReceiptPreview(null);
  renderExpenses();
  renderRecentExpenses();
  renderBalances();
  renderStats();
  updateExpenseAvailability();

  if (isSyncEnabled()) {
    try {
      await apiRequest("appendExpense", newExpense);
    } catch (error) {
      console.error("No fue posible sincronizar el egreso", error);
      setStatusMessage(
        expenseMessage,
        "Egreso guardado localmente, pero no se pudo sincronizar con Google Sheets.",
        "error",
      );
    }
  }
});

clientForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("client-name").value.trim();
  const city = document.getElementById("client-city").value.trim();
  const contact = document.getElementById("client-contact").value.trim();

  if (!name || !city) {
    setStatusMessage(clientMessage, "Complete todos los campos obligatorios.", "error");
    return;
  }

  const clientCode = normalizeCodeSegment(name);
  const clientId = `client_${crypto.randomUUID()}`;
  state.clients.push({
    id: clientId,
    code: clientCode,
    name,
    city,
    contact,
  });
  persistState();
  setStatusMessage(clientMessage, "Cliente creado.", "success");
  clientForm.reset();
  renderClients();
  renderOptions();
  renderStats();

  if (isSyncEnabled()) {
    try {
      await apiRequest("appendClient", {
        id: clientId,
        code: clientCode,
        name,
        city,
        contact,
      });
    } catch (error) {
      console.error("No fue posible sincronizar el cliente", error);
      setStatusMessage(
        clientMessage,
        "Cliente guardado localmente, pero no se pudo sincronizar con Google Sheets.",
        "error",
      );
    }
  }
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const clientId = projectClient.value;
  const client = state.clients.find((item) => item.id === clientId);
  const code = projectCodeInput.value.trim() || getSuggestedProjectCode();
  const name = document.getElementById("project-name").value.trim();
  const city = document.getElementById("project-city").value.trim();
  const baseAmount = Number(document.getElementById("project-base").value);

  if (!client) {
    setStatusMessage(projectMessage, "Seleccione un cliente válido.", "error");
    return;
  }

  if (!code || !name || !city || !baseAmount) {
    setStatusMessage(projectMessage, "Complete todos los campos del proyecto.", "error");
    return;
  }

  const projectId = `project_${crypto.randomUUID()}`;
  state.projects.push({
    id: projectId,
    clientId: client.id,
    clientName: client.name,
    code,
    name,
    city,
    baseAmount,
  });
  persistState();
  setStatusMessage(projectMessage, "Proyecto creado.", "success");
  projectForm.reset();
  projectCodeInput.dataset.auto = "true";
  renderOptions();
  renderProjects();
  renderBalances();
  renderStats();

  if (isSyncEnabled()) {
    try {
      await apiRequest("appendProject", {
        id: projectId,
        clientId: client.id,
        clientName: client.name,
        code,
        name,
        city,
        baseAmount,
      });
    } catch (error) {
      console.error("No fue posible sincronizar el proyecto", error);
      setStatusMessage(
        projectMessage,
        "Proyecto guardado localmente, pero no se pudo sincronizar con Google Sheets.",
        "error",
      );
    }
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

  const userId = `user_${crypto.randomUUID()}`;
  state.users.push({
    id: userId,
    name,
    username,
    password,
    role,
  });
  persistState();
  setStatusMessage(userMessage, "Usuario creado.", "success");
  userForm.reset();
  renderUsers();

  if (isSyncEnabled()) {
    try {
      await apiRequest("appendUser", {
        id: userId,
        name,
        username,
        password,
        role,
      });
    } catch (error) {
      console.error("No fue posible sincronizar el usuario", error);
      setStatusMessage(
        userMessage,
        "Usuario guardado localmente, pero no se pudo sincronizar con Google Sheets.",
        "error",
      );
    }
  }
});

function initApp() {
  sheetIdEl.textContent = CONFIG.sheetId;
  const folderLink = document.createElement("a");
  folderLink.href = folderUrl;
  folderLink.textContent = CONFIG.driveFolderId;
  folderLink.target = "_blank";
  folderLink.rel = "noreferrer";
  folderLink.className = "link";
  driveFolderEl.append(folderLink);

  if (projectCodeInput) {
    projectCodeInput.dataset.auto = "true";
  }

  setStatusMessage(sheetStatusEl, getSheetStatusLabel());
  updateView();
  syncFromSheets();
}

initApp();
