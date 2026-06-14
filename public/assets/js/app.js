console.log("Welcome to your DOOM! Mesão do MTG!");

const API_URL = "http://localhost:3000/decks";
let deckCache = [];
let editingDeckId = null;

async function fetchDecks(forceRefresh = false) {
  if (!forceRefresh && deckCache.length > 0) {
    return deckCache;
  }

  try {
    console.log("Tentando buscar decks de:", API_URL);
    const response = await fetch(API_URL);

    if (!response.ok) {
      console.error("Erro na resposta:", response.status, response.statusText);
      return [];
    }

    const decks = await response.json();
    deckCache = decks;
    console.log("Decks carregados com sucesso:", decks);
    return decks;
  } catch (error) {
    console.error("Erro ao buscar decks:", error);
    console.error("Certifique-se de que o JSON Server está rodando na porta 3000");
    return [];
  }
}

function renderCarousel(decks) {
  const carouselInner = document.getElementById("carousel-inner");

  if (!carouselInner) {
    return;
  }

  carouselInner.innerHTML = "";
  const carouselDecks = decks.slice(0, 3);

  carouselDecks.forEach((deck, index) => {
    const isActive = index === 0 ? "active" : "";
    const carouselItem = document.createElement("div");
    carouselItem.className = `carousel-item ${isActive}`;
    carouselItem.innerHTML = `
      <a href="detalhes.html?id=${deck.id}" class="carousel-link">
        <img src="${deck.imagem}" alt="${deck.titulo}" class="carousel-image">
        <div class="carousel-caption">
          <h3>${deck.titulo}</h3>
          <p>${deck.descricao}</p>
        </div>
      </a>
    `;
    carouselInner.appendChild(carouselItem);
  });
}

function renderCardsContainer(decks) {
  const container = document.getElementById("cards-container");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  decks.forEach(deck => {
    const card = document.createElement("a");
    card.classList.add("deck");
    card.href = `detalhes.html?id=${deck.id}`;
    card.style.backgroundImage = `url('${deck.imagem}')`;

    card.innerHTML = `
      <div class="deck-content">
        <h3>${deck.titulo}</h3>
        <p>${deck.descricao}</p>
      </div>
    `;

    container.appendChild(card);
  });
}

function setCrudStatus(message, type = "") {
  const statusElement = document.getElementById("crud-status");

  if (!statusElement) {
    return;
  }

  statusElement.textContent = message;
  statusElement.className = `crud-status ${type}`.trim();
}

function resetCrudForm() {
  const form = document.getElementById("deck-form");
  if (!form) {
    return;
  }

  form.reset();
  editingDeckId = null;
  document.getElementById("deck-id").value = "";
}

function populateCrudForm(deck) {
  const titleInput = document.getElementById("deck-title");
  const descriptionInput = document.getElementById("deck-description");
  const contentInput = document.getElementById("deck-content");
  const idInput = document.getElementById("deck-id");

  if (!titleInput || !descriptionInput || !contentInput || !idInput) {
    return;
  }

  titleInput.value = deck.titulo || "";
  descriptionInput.value = deck.descricao || "";
  contentInput.value = deck.conteudo || "";
  idInput.value = deck.id || "";
  editingDeckId = deck.id;
}

function renderCrudDeckList(decks) {
  const list = document.getElementById("crud-list");

  if (!list) {
    return;
  }

  if (!decks.length) {
    list.innerHTML = '<li class="crud-item"><p>Nenhum deck encontrado.</p></li>';
    return;
  }

  list.innerHTML = decks.map(deck => `
    <li class="crud-item">
      <div>
        <h4>${deck.titulo}</h4>
        <p>${deck.descricao}</p>
      </div>
      <div class="crud-item-actions">
        <button type="button" data-action="edit" data-id="${deck.id}">Editar</button>
        <button type="button" data-action="delete" data-id="${deck.id}">Excluir</button>
      </div>
    </li>
  `).join("");
}

async function handleCrudSubmit(event) {
  event.preventDefault();

  const titleInput = document.getElementById("deck-title");
  const descriptionInput = document.getElementById("deck-description");
  const contentInput = document.getElementById("deck-content");
  const idInput = document.getElementById("deck-id");

  if (!titleInput || !descriptionInput || !contentInput || !idInput) {
    return;
  }

  const deckData = {
    id: editingDeckId || String(Date.now()),
    titulo: titleInput.value.trim(),
    descricao: descriptionInput.value.trim(),
    conteudo: contentInput.value.trim(),
    imagem: "assets/img/white.jpg",
    cartas_principais: []
  };

  if (!deckData.titulo || !deckData.descricao || !deckData.conteudo) {
    setCrudStatus("Preencha todos os campos para salvar o deck.", "error");
    return;
  }

  try {
    if (editingDeckId) {
      const response = await fetch(`${API_URL}/${editingDeckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deckData)
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar o deck.");
      }

      setCrudStatus("Deck atualizado com sucesso!", "success");
    } else {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deckData)
      });

      if (!response.ok) {
        throw new Error("Não foi possível criar o deck.");
      }

      setCrudStatus("Deck criado com sucesso!", "success");
    }

    await refreshDecks();
    resetCrudForm();
  } catch (error) {
    console.error(error);
    setCrudStatus(error.message, "error");
  }
}

async function handleCrudDelete(deckId) {
  const confirmed = window.confirm("Deseja realmente excluir este deck?");

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${deckId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Não foi possível remover o deck.");
    }

    setCrudStatus("Deck removido com sucesso!", "success");
    await refreshDecks();
    if (editingDeckId === deckId) {
      resetCrudForm();
    }
  } catch (error) {
    console.error(error);
    setCrudStatus(error.message, "error");
  }
}

async function handleCrudSearch() {
  const searchInput = document.getElementById("search-name");

  if (!searchInput) {
    return;
  }

  const query = searchInput.value.trim().toLowerCase();
  const decks = await fetchDecks();

  if (!query) {
    renderCrudDeckList(decks);
    setCrudStatus("Mostrando todos os decks.", "");
    return;
  }

  const filteredDecks = decks.filter(deck =>
    deck.titulo.toLowerCase().includes(query)
  );

  renderCrudDeckList(filteredDecks);

  if (filteredDecks.length) {
    const match = filteredDecks[0];
    populateCrudForm(match);
    setCrudStatus(`Exibindo resultado para: ${match.titulo}`, "");
  } else {
    setCrudStatus("Nenhum deck encontrado com este nome.", "error");
  }
}

async function refreshDecks() {
  const decks = await fetchDecks(true);
  renderCarousel(decks);
  renderCardsContainer(decks);
  renderCrudDeckList(decks);
}

function initCrudActions() {
  const form = document.getElementById("deck-form");
  const cancelButton = document.getElementById("cancel-edit");
  const searchButton = document.getElementById("search-button");
  const showAllButton = document.getElementById("show-all-button");
  const crudList = document.getElementById("crud-list");
  const searchInput = document.getElementById("search-name");

  if (form) {
    form.addEventListener("submit", handleCrudSubmit);
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      resetCrudForm();
      setCrudStatus("Edição cancelada.", "");
    });
  }

  if (searchButton) {
    searchButton.addEventListener("click", handleCrudSearch);
  }

  if (showAllButton) {
    showAllButton.addEventListener("click", async () => {
      searchInput.value = "";
      await refreshDecks();
      setCrudStatus("Mostrando todos os decks.", "");
    });
  }

  if (crudList) {
    crudList.addEventListener("click", async event => {
      const button = event.target.closest("button[data-action]");

      if (!button) {
        return;
      }

      const action = button.dataset.action;
      const deckId = button.dataset.id;

      const decks = await fetchDecks();
      const deck = decks.find(item => item.id === deckId);

      if (!deck) {
        return;
      }

      if (action === "edit") {
        populateCrudForm(deck);
        setCrudStatus(`Editando: ${deck.titulo}`, "");
      }

      if (action === "delete") {
        await handleCrudDelete(deckId);
      }
    });
  }
}

async function initDetalhesContainer() {
  const detalhesContainer = document.getElementById("detalhes-container");

  if (detalhesContainer) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const decks = await fetchDecks();
    const deck = decks.find(d => d.id === id);

    if (deck) {
      let cartasPrincipaisHTML = "";

      if (deck.cartas_principais && deck.cartas_principais.length > 0) {
        cartasPrincipaisHTML = `
          <section class="cartas-principais-section">
            <h3>Cartas Principais</h3>
            <div class="cartas-grid">
              ${deck.cartas_principais.map(carta => `
                <div class="carta">
                  <img src="${carta.imagem}" alt="${carta.nome}" class="carta-image">
                  <p class="carta-nome">${carta.nome}</p>
                </div>
              `).join("")}
            </div>
          </section>
        `;
      }

      detalhesContainer.innerHTML = `
        <section class="detalhes-header">
          <img src="${deck.imagem}" alt="${deck.titulo}" class="detalhes-image">
          <div class="detalhes-info">
            <h2>${deck.titulo}</h2>
            <p class="descricao"><strong>Descrição:</strong> ${deck.descricao}</p>
            <p class="conteudo">${deck.conteudo}</p>
            <a href="index.html" class="btn-voltar">⬅ Voltar</a>
          </div>
        </section>
        ${cartasPrincipaisHTML}
      `;
    } else {
      detalhesContainer.innerHTML = `<p>Item não encontrado. ID: ${id}</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await refreshDecks();
  initCrudActions();
  await initDetalhesContainer();
});