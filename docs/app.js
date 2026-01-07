const CONFIG = {
  sheetId: "1tLdiGfhlSR0jsXT89jk-dDGfhci-Y3IAiECoR2g5RCo",
  driveFolderId: "1Q7mcMtEQoccD5gfux4TXNi9zY9qnIiXf",
};

const STORAGE_KEY = "gastos_ingenieria_state";

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
};

const state = loadState();

const sheetIdEl = document.getElementById("sheet-id");
const driveFolderEl = document.getElementById("drive-folder");
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

const userForm = document.getElementById("user-form");
const userMessage = document.getElementById("user-message");
const clientForm = document.getElementById("client-form");
const clientMessage = document.getElementById("client-message");
const projectForm = document.getElementById("project-form");
const projectMessage = document.getElementById("project-message");
const projectClient = document.getElementById("project-client");

const expenseReceipt = document.getElementById("expense-receipt");

sheetIdEl.textContent = CONFIG.sheetId;
const folderUrl = `https://drive.google.com/drive/folders/${CONFIG.driveFolderId}`;
const folderLink = document.createElement("a");
folderLink.href = folderUrl;
folderLink.textContent = CONFIG.driveFolderId;
folderLink.target = "_blank";
folderLink.rel = "noreferrer";
folderLink.className = "link";

driveFolderEl.append(folderLink);

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(defaultState);
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
    };
  } catch (error) {
    console.error("No se pudo cargar el estado", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateView() {
  const isLoggedIn = Boolean(state.currentUser);
  loginSection.classList.toggle("hidden", isLoggedIn);
  appSection.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    return;
  }

  userSummary.textContent = `${state.currentUser.name} · Rol ${state.currentUser.role}`;
  adminSection.classList.toggle("hidden", state.currentUser.role !== "admin");

  renderOptions();
  renderBalances();
  renderExpenses();
  updateExpenseAvailability();
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
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = `${project.clientName} · ${project.name} (${project.city}) · Saldo $${remaining.toLocaleString()}`;
    balancesEl.append(badge);
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
      return `<tr>
          <td>${expense.date}</td>
          <td>${expense.clientName}</td>
          <td>${expense.projectName}</td>
          <td>${expense.category}</td>
          <td>${expense.description}</td>
          <td>$${expense.amount.toLocaleString()}</td>
          <td>${expense.receiptName}</td>
        </tr>`;
    })
    .join("");

  expenseTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Proyecto</th>
          <th>Categoría</th>
          <th>Descripción</th>
          <th>Valor</th>
          <th>Comprobante</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const found = state.users.find((user) => user.username === username && user.password === password);

  if (!found) {
    loginMessage.textContent = "Credenciales inválidas.";
    return;
  }

  state.currentUser = { ...found };
  saveState();
  loginMessage.textContent = "";
  loginForm.reset();
  updateView();
});

logoutButton.addEventListener("click", () => {
  state.currentUser = null;
  saveState();
  updateView();
});

expenseClient.addEventListener("change", () => {
  renderOptions();
  updateExpenseAvailability();
});

expenseProject.addEventListener("change", () => {
  renderOptions();
  updateExpenseAvailability();
});

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const projectId = expenseProject.value;
  const remaining = calculateProjectBalance(projectId);
  if (remaining <= 0) {
    expenseMessage.textContent = "La caja está en $0. No se puede registrar el egreso.";
    return;
  }

  const receiptFile = expenseReceipt.files[0];
  if (!receiptFile) {
    expenseMessage.textContent = "Debe adjuntar una foto del comprobante.";
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
    expenseMessage.textContent = "El valor supera el saldo disponible en la caja.";
    return;
  }

  state.expenses.push(newExpense);
  saveState();
  expenseForm.reset();
  expenseMessage.textContent = "Egreso registrado correctamente.";
  renderBalances();
  renderExpenses();
  updateExpenseAvailability();
});

userForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("user-name").value.trim();
  const username = document.getElementById("user-username").value.trim();
  const password = document.getElementById("user-password").value.trim();
  const role = document.getElementById("user-role").value;

  if (state.users.some((user) => user.username === username)) {
    userMessage.textContent = "El usuario ya existe.";
    return;
  }

  state.users.push({
    id: `user_${crypto.randomUUID()}`,
    name,
    username,
    password,
    role,
  });
  saveState();
  userForm.reset();
  userMessage.textContent = "Usuario creado.";
});

clientForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("client-name").value.trim();
  const city = document.getElementById("client-city").value.trim();

  if (!name || !city) {
    clientMessage.textContent = "Complete todos los campos.";
    return;
  }

  state.clients.push({
    id: `client_${crypto.randomUUID()}`,
    name,
    city,
  });
  saveState();
  clientForm.reset();
  clientMessage.textContent = "Cliente creado.";
  renderOptions();
});

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const clientId = projectClient.value;
  const client = state.clients.find((item) => item.id === clientId);
  const name = document.getElementById("project-name").value.trim();
  const baseAmount = Number(document.getElementById("project-base").value);

  if (!client) {
    projectMessage.textContent = "Seleccione un cliente válido.";
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
  saveState();
  projectForm.reset();
  projectMessage.textContent = "Proyecto creado.";
  renderOptions();
  renderBalances();
});

updateView();
