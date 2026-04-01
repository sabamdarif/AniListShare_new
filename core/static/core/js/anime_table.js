(function () {
  "use strict";

  var tabsContainer = document.getElementById("category_tabs");
  var tableBody = document.getElementById("anime_table_body");
  var tableEl = document.getElementById("anime_table");
  if (!tabsContainer || !tableBody || !tableEl) return;

  var tabs = tabsContainer.querySelectorAll(".category_tab");
  var MOBILE_BP = 768;
  var lastList = [];
  var _currentCategoryId = null;

  var isMobile = function () {
    return window.innerWidth <= MOBILE_BP;
  };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  /**
   * Only allow http / https URLs for thumbnails.
   * Blocks javascript:, data:, vbscript:, etc.
   */
  function sanitizeUrl(url) {
    if (!url) return "";
    try {
      var parsed = new URL(url);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.href;
      }
    } catch (_) {
      /* invalid URL */
    }
    return "";
  }

  /* ────────────────────────────────────────────
   *  Image-error handler (replaces inline onerror)
   * ──────────────────────────────────────────── */
  document.addEventListener(
    "error",
    function (e) {
      if (
        e.target.tagName === "IMG" &&
        (e.target.classList.contains("thumb_img") ||
          e.target.classList.contains("m_card_thumb"))
      ) {
        e.target.style.display = "none";
      }
    },
    true,
  );

  /* ────────────────────────────────────────────
   *  Tab handling
   * ──────────────────────────────────────────── */

  function setActiveTab(btn) {
    tabs.forEach(function (t) {
      t.classList.remove("active");
      if (
        t.parentElement &&
        t.parentElement.classList.contains("category_tab_wrapper")
      ) {
        t.parentElement.classList.remove("active");
      }
    });
    btn.classList.add("active");
    if (
      btn.parentElement &&
      btn.parentElement.classList.contains("category_tab_wrapper")
    ) {
      btn.parentElement.classList.add("active");
    }
  }

  /* ────────────────────────────────────────────
   *  Skeleton loading
   * ──────────────────────────────────────────── */

  function showSkeleton(rows) {
    var i, html;
    if (isMobile()) {
      tableEl.style.display = "none";
      var wrapper = document.getElementById("mobile_card_list");
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = "mobile_card_list";
        wrapper.className = "mobile_card_list";
        tableEl.parentElement.appendChild(wrapper);
      }
      html = "";
      for (i = 0; i < rows; i++) {
        html +=
          '<div class="m_card m_card_skel">' +
          '<div class="skel skel_thumb_m"></div>' +
          '<div class="m_card_body">' +
          '<div class="skel skel_text" style="width:60%"></div>' +
          '<div class="skel skel_text" style="width:80%;margin-top:6px"></div>' +
          '<div class="skel skel_badge" style="margin-top:8px"></div>' +
          "</div></div>";
      }
      wrapper.innerHTML = html;
    } else {
      removeMobileList();
      tableEl.style.display = "";
      html = "";
      for (i = 0; i < rows; i++) {
        html +=
          '<tr class="skeleton_row">' +
          '<td class="col_id"><span class="skel"></span></td>' +
          '<td class="col_thumb"><span class="skel skel_thumb"></span></td>' +
          '<td class="col_name"><span class="skel skel_text"></span></td>' +
          '<td class="col_season"><span class="skel skel_badge"></span></td>' +
          '<td class="col_lang"><span class="skel skel_badge"></span></td>' +
          '<td class="col_stars"><span class="skel skel_text_sm"></span></td>' +
          '<td class="col_edit"><span class="skel skel_btn"></span></td>' +
          "</tr>";
      }
      tableBody.innerHTML = html;
    }
  }

  function removeMobileList() {
    var el = document.getElementById("mobile_card_list");
    if (el) el.remove();
  }

  /* ────────────────────────────────────────────
   *  Data normalisation
   *
   *  The API returns seasons with:
   *    total_episodes, watched_episodes, is_completed
   *  Internal render functions expect:
   *    total, watched, completed
   * ──────────────────────────────────────────── */

  function normalizeSeason(s) {
    var total =
      s.total_episodes != null
        ? Number(s.total_episodes)
        : Number(s.total || 0);
    var watched =
      s.watched_episodes != null
        ? Number(s.watched_episodes)
        : Number(s.watched || 0);
    var completed =
      s.is_completed != null
        ? Boolean(s.is_completed)
        : s.completed != null
          ? Boolean(s.completed)
          : total > 0 && watched >= total;

    return {
      number: Number(s.number) || 1,
      total: total,
      watched: watched,
      completed: completed,
      comment: s.comment || "",
    };
  }

  function normalizeAnime(raw) {
    return {
      id: raw.id,
      name: raw.name || "",
      thumbnail_url: raw.thumbnail_url || "",
      language: raw.language || "",
      stars: raw.stars,
      order: raw.order || 0,
      seasons: (raw.seasons || []).map(normalizeSeason),
      _pending: Boolean(raw._pending),
    };
  }

  /* ────────────────────────────────────────────
   *  Language parsing
   * ──────────────────────────────────────────── */

  var LANG_MAP = {
    jap: "Japanese",
    japanese: "Japanese",
    jp: "Japanese",
    eng: "English",
    english: "English",
    en: "English",
    kor: "Korean",
    korean: "Korean",
    chi: "Chinese",
    chinese: "Chinese",
  };

  function parseLanguages(raw) {
    if (!raw) return [];
    return raw
      .split(",")
      .map(function (l) {
        return l.trim().toLowerCase();
      })
      .filter(Boolean)
      .map(function (l) {
        return LANG_MAP[l] || l.charAt(0).toUpperCase() + l.slice(1);
      });
  }

  /* ────────────────────────────────────────────
   *  Rendering helpers
   * ──────────────────────────────────────────── */

  function hasSeasonComment(s) {
    return s.comment != null && String(s.comment).trim().length > 0;
  }

  function renderSeasonsDesktop(seasons) {
    if (!seasons || !seasons.length) {
      return '<span class="season_pill" style="opacity:.5">\u2014</span>';
    }

    return seasons
      .map(function (s) {
        var has = hasSeasonComment(s);
        var icon = has
          ? '<i class="nf nf-fa-comment season_comment_icon"></i>'
          : "";
        var attr = has
          ? ' data-comment="' +
            escapeHtml(s.comment) +
            '" data-season="S' +
            escapeHtml(String(s.number)) +
            '"'
          : "";
        var cls = has ? " season_has_comment" : "";
        var num = escapeHtml(String(s.number));

        if (s.completed) {
          return (
            '<span class="season_pill season_has_tooltip' +
            cls +
            '"' +
            attr +
            ">S" +
            num +
            '<span class="s_check">\u2713</span>' +
            icon +
            "</span>"
          );
        }

        var pct = s.total > 0 ? Math.round((s.watched / s.total) * 100) : 0;
        return (
          '<span class="season_progress_box season_has_tooltip' +
          cls +
          '"' +
          attr +
          ">" +
          '<span class="season_progress_top">' +
          '<span class="season_progress_label">S' +
          num +
          "</span>" +
          '<span class="season_progress_frac">' +
          Number(s.watched) +
          "/" +
          Number(s.total) +
          "</span></span>" +
          '<span class="season_progress_track">' +
          '<span class="season_progress_fill" style="width:' +
          pct +
          '%"></span></span>' +
          icon +
          "</span>"
        );
      })
      .join("");
  }

  function renderSeasonsMobile(seasons) {
    if (!seasons || !seasons.length) return "";
    return seasons
      .map(function (s) {
        var pct = s.completed
          ? 100
          : s.total > 0
            ? Math.round((s.watched / s.total) * 100)
            : 0;
        var checkmark = s.completed
          ? '<span class="m_season_check">\u2713</span>'
          : "";
        var has = hasSeasonComment(s);
        var icon = has
          ? '<i class="nf nf-fa-comment m_season_comment_icon"></i>'
          : "";
        var attr = has
          ? ' data-comment="' +
            escapeHtml(s.comment) +
            '" data-season="Season ' +
            escapeHtml(String(s.number)) +
            '"'
          : "";
        var num = escapeHtml(String(s.number));
        var label = s.completed
          ? "Season " + num
          : "Season " +
            num +
            ' <span class="m_season_progress_text">' +
            Number(s.watched) +
            "/" +
            Number(s.total) +
            "</span>";

        return (
          '<div class="m_season_item m_season_has_popup"' +
          attr +
          ">" +
          '<div class="m_season_label">' +
          label +
          checkmark +
          icon +
          "</div>" +
          '<div class="m_season_bar_track">' +
          '<div class="m_season_bar_fill' +
          (s.completed ? " m_bar_done" : "") +
          '" style="width:' +
          pct +
          '%"></div></div></div>'
        );
      })
      .join("");
  }

  function renderStars(val) {
    if (val == null) return '<span class="star_display">\u2014</span>';
    var rating = parseFloat(val);
    if (isNaN(rating)) return '<span class="star_display">\u2014</span>';
    var stars = "";
    for (var i = 1; i <= 5; i++) {
      if (rating >= i) stars += '<span class="star filled">\u2605</span>';
      else if (rating >= i - 0.5)
        stars += '<span class="star half">\u2605</span>';
      else stars += '<span class="star empty">\u2605</span>';
    }
    return (
      '<span class="star_display">' +
      stars +
      '<span class="star_num">' +
      rating.toFixed(1) +
      "</span></span>"
    );
  }

  /* ────────────────────────────────────────────
   *  Main renderers
   * ──────────────────────────────────────────── */

  function renderTable(animeList) {
    removeMobileList();
    tableEl.style.display = "";
    if (!animeList.length) {
      tableBody.innerHTML =
        '<tr><td colspan="7" class="empty_msg">No anime found in this category.</td></tr>';
      return;
    }
    var html = "";
    animeList.forEach(function (a, idx) {
      var langs = parseLanguages(a.language);
      var seasonBadges = renderSeasonsDesktop(a.seasons);
      var langBadges = langs
        .map(function (l) {
          return '<span class="badge badge_lang">' + escapeHtml(l) + "</span>";
        })
        .join("");
      var safeUrl = sanitizeUrl(a.thumbnail_url);
      var safeName = escapeHtml(a.name);
      var thumbHtml = safeUrl
        ? '<img src="' +
          escapeHtml(safeUrl) +
          '" alt="' +
          safeName +
          '" class="thumb_img" loading="lazy">'
        : "";

      html +=
        '<tr data-anime-id="' +
        a.id +
        '">' +
        '<td class="col_id">' +
        (idx + 1) +
        "</td>" +
        '<td class="col_thumb">' +
        thumbHtml +
        "</td>" +
        '<td class="col_name">' +
        safeName +
        "</td>" +
        '<td class="col_season"><div class="season_wrap">' +
        seasonBadges +
        "</div></td>" +
        '<td class="col_lang"><div class="badge_wrap">' +
        langBadges +
        "</div></td>" +
        '<td class="col_stars">' +
        renderStars(a.stars) +
        "</td>" +
        '<td class="col_edit">' +
        '<button class="edit_btn" title="Edit">' +
        '<i class="nf nf-fa-pencil"></i></button></td>' +
        "</tr>";
    });
    tableBody.innerHTML = html;
  }

  function renderCards(animeList) {
    tableEl.style.display = "none";
    var wrapper = document.getElementById("mobile_card_list");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.id = "mobile_card_list";
      wrapper.className = "mobile_card_list";
      tableEl.parentElement.appendChild(wrapper);
    }
    if (!animeList.length) {
      wrapper.innerHTML =
        '<p class="empty_msg">No anime found in this category.</p>';
      return;
    }
    var html = "";
    animeList.forEach(function (a, idx) {
      var langs = parseLanguages(a.language);
      var langBadges = langs
        .map(function (l) {
          return '<span class="badge badge_lang">' + escapeHtml(l) + "</span>";
        })
        .join("");
      var seasonsHtml = renderSeasonsMobile(a.seasons);
      var rating = a.stars != null ? parseFloat(a.stars).toFixed(1) : "\u2014";
      var safeUrl = sanitizeUrl(a.thumbnail_url);
      var safeName = escapeHtml(a.name);
      var displayId = escapeHtml(String(a.id || idx + 1));
      var thumbHtml = safeUrl
        ? '<img src="' +
          escapeHtml(safeUrl) +
          '" alt="' +
          safeName +
          '" class="m_card_thumb" loading="lazy">'
        : "";

      html +=
        '<div class="m_card" data-anime-id="' +
        a.id +
        '">' +
        thumbHtml +
        '<div class="m_card_body">' +
        '<span class="m_card_id">ID: ' +
        displayId +
        "</span>" +
        '<h3 class="m_card_title">' +
        safeName +
        "</h3>" +
        '<div class="m_card_seasons">' +
        seasonsHtml +
        "</div>" +
        '<div class="badge_wrap m_card_langs">' +
        langBadges +
        "</div>" +
        '<div class="m_card_footer">' +
        '<span class="m_card_rating"><span class="star filled">\u2605</span> ' +
        escapeHtml(String(rating)) +
        "</span>" +
        '<button class="edit_btn" title="Edit">' +
        '<i class="nf nf-fa-pencil"></i></button>' +
        "</div></div></div>";
    });
    wrapper.innerHTML = html;
  }

  function render(animeList) {
    lastList = animeList;
    if (isMobile()) renderCards(animeList);
    else renderTable(animeList);
  }

  /* ────────────────────────────────────────────
   *  API communication
   * ──────────────────────────────────────────── */

  async function loadCategory(categoryId) {
    var catId = parseInt(categoryId, 10);
    if (isNaN(catId)) return;

    _currentCategoryId = catId;
    showSkeleton(4);

    try {
      var res = await fetch("/api/anime/list/category/" + catId + "/", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error("HTTP " + res.status);

      var data = await res.json();

      /* ListAPIView returns a plain array unless pagination is enabled,
         in which case results live under data.results.                  */
      var serverList = Array.isArray(data) ? data : data.results || [];
      var normalized = serverList.map(normalizeAnime);

      render(normalized);
    } catch (_) {
      if (isMobile()) {
        removeMobileList();
        var w = document.createElement("div");
        w.id = "mobile_card_list";
        w.className = "mobile_card_list";
        var p = document.createElement("p");
        p.className = "empty_msg";
        p.textContent = "Failed to load anime.";
        w.appendChild(p);
        tableEl.parentElement.appendChild(w);
        tableEl.style.display = "none";
      } else {
        removeMobileList();
        tableEl.style.display = "";
        tableBody.innerHTML =
          '<tr><td colspan="7" class="empty_msg">Failed to load anime.</td></tr>';
      }
    }
  }

  /* ────────────────────────────────────────────
   *  Global refresh
   * ──────────────────────────────────────────── */

  window.refreshCurrentCategory = function () {
    if (_currentCategoryId != null) loadCategory(_currentCategoryId);
  };

  /* ────────────────────────────────────────────
   *  Edit button handlers
   *
   *  Delegated click on table body & mobile card
   *  list to open the edit anime modal.
   * ──────────────────────────────────────────── */

  function findAnimeById(id) {
    return lastList.find(function (a) {
      return String(a.id) === String(id);
    });
  }

  function handleEditClick(e) {
    var btn = e.target.closest(".edit_btn");
    if (!btn) return;
    e.stopPropagation();

    var container = btn.closest("[data-anime-id]");
    if (!container) return;

    var animeId = container.getAttribute("data-anime-id");
    var anime = findAnimeById(animeId);
    if (!anime || !_currentCategoryId) return;

    if (typeof window.openEditAnimeModal === "function") {
      window.openEditAnimeModal(anime, _currentCategoryId);
    }
  }

  tableBody.addEventListener("click", handleEditClick);

  // Also listen on mobile card list (created dynamically)
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".edit_btn");
    if (!btn) return;

    var mobileCard = btn.closest(".m_card[data-anime-id]");
    if (!mobileCard) return;

    e.stopPropagation();
    var animeId = mobileCard.getAttribute("data-anime-id");
    var anime = findAnimeById(animeId);
    if (!anime || !_currentCategoryId) return;

    if (typeof window.openEditAnimeModal === "function") {
      window.openEditAnimeModal(anime, _currentCategoryId);
    }
  });

  /* ────────────────────────────────────────────
   *  Drag-and-drop reorder
   *
   *  Desktop: click-and-drag on the # column.
   *  Mobile:  long-press anywhere on a card.
   * ──────────────────────────────────────────── */

  var REORDER_API = "/api/anime/list/category/";
  var MOBILE_HOLD_MS = 400;
  var DRAG_DEAD_ZONE = 4;

  function getCSRF() {
    var el = document.querySelector("[name=csrfmiddlewaretoken]");
    if (el) return el.value;
    var m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function reorderList(fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx === toIdx - 1) return null;
    var copy = lastList.slice();
    var item = copy.splice(fromIdx, 1)[0];
    var insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
    copy.splice(insertAt, 0, item);
    return copy;
  }

  async function persistOrder(newList) {
    if (!_currentCategoryId || !newList) return;
    var ids = newList.map(function (a) {
      return a.id;
    });
    try {
      var resp = await fetch(REORDER_API + _currentCategoryId + "/reorder/", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRF(),
        },
        body: JSON.stringify({ order: ids }),
      });
      if (!resp.ok) throw new Error("Reorder failed");
      lastList = newList;
      render(lastList);
    } catch (_) {
      if (_currentCategoryId) loadCategory(_currentCategoryId);
    }
  }

  /* ═══════════════════════════════════════════
   *  DESKTOP — immediate drag on .col_id
   * ═══════════════════════════════════════════ */
  (function () {
    var state = null;

    function removeIndicator() {
      var el = tableBody.querySelector(".anime_drop_indicator");
      if (el) el.remove();
    }

    function getDropIdx(clientY) {
      var rows = tableBody.querySelectorAll("tr[data-anime-id]");
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i].getBoundingClientRect();
        if (clientY < r.top + r.height / 2) return i;
      }
      return rows.length;
    }

    function showIndicator(idx) {
      removeIndicator();
      var rows = tableBody.querySelectorAll("tr[data-anime-id]");
      var ind = document.createElement("tr");
      ind.className = "anime_drop_indicator";
      ind.innerHTML =
        '<td colspan="7"><div class="anime_drop_line"></div></td>';
      if (idx < rows.length) {
        tableBody.insertBefore(ind, rows[idx]);
      } else {
        tableBody.appendChild(ind);
      }
    }

    tableBody.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      var td = e.target.closest(".col_id");
      if (!td) return;
      var tr = td.closest("tr[data-anime-id]");
      if (!tr) return;

      e.preventDefault();

      var rows = tableBody.querySelectorAll("tr[data-anime-id]");
      var fromIdx = Array.prototype.indexOf.call(rows, tr);
      if (fromIdx < 0) return;

      var startX = e.clientX;
      var startY = e.clientY;
      var rect = tr.getBoundingClientRect();

      state = {
        tr: tr,
        fromIdx: fromIdx,
        startX: startX,
        startY: startY,
        offsetY: e.clientY - rect.top,
        offsetX: e.clientX - rect.left,
        ghost: null,
        dragging: false,
      };
    });

    document.addEventListener("mousemove", function (e) {
      if (!state) return;

      if (!state.dragging) {
        var dx = Math.abs(e.clientX - state.startX);
        var dy = Math.abs(e.clientY - state.startY);
        if (dx < DRAG_DEAD_ZONE && dy < DRAG_DEAD_ZONE) return;

        // Activate drag
        state.dragging = true;
        state.tr.classList.add("anime_dragging");
        document.body.classList.add("anime_reorder_active");

        var ghost = state.tr.cloneNode(true);
        ghost.className = "anime_drag_ghost";
        ghost.style.width = state.tr.offsetWidth + "px";
        document.body.appendChild(ghost);
        state.ghost = ghost;
      }

      e.preventDefault();
      state.ghost.style.top = e.clientY - state.offsetY + "px";
      state.ghost.style.left = e.clientX - state.offsetX + "px";
      showIndicator(getDropIdx(e.clientY));
    });

    document.addEventListener("mouseup", function (e) {
      if (!state) return;
      var s = state;
      state = null;

      if (!s.dragging) return;

      var dropIdx = getDropIdx(e.clientY);
      removeIndicator();
      s.tr.classList.remove("anime_dragging");
      s.ghost.remove();
      document.body.classList.remove("anime_reorder_active");

      var newList = reorderList(s.fromIdx, dropIdx);
      if (newList) persistOrder(newList);
    });
  })();

  /* ═══════════════════════════════════════════
   *  MOBILE — long-press anywhere on .m_card
   * ═══════════════════════════════════════════ */
  (function () {
    var state = null;
    var pressTimer = null;

    function removeIndicator(wrapper) {
      if (!wrapper) return;
      var el = wrapper.querySelector(".anime_drop_indicator_mobile");
      if (el) el.remove();
    }

    function getDropIdx(wrapper, clientY) {
      var cards = wrapper.querySelectorAll(".m_card[data-anime-id]");
      for (var i = 0; i < cards.length; i++) {
        var r = cards[i].getBoundingClientRect();
        if (clientY < r.top + r.height / 2) return i;
      }
      return cards.length;
    }

    function showIndicator(wrapper, idx) {
      removeIndicator(wrapper);
      var cards = wrapper.querySelectorAll(".m_card[data-anime-id]");
      var ind = document.createElement("div");
      ind.className = "anime_drop_indicator_mobile";
      if (idx < cards.length) {
        wrapper.insertBefore(ind, cards[idx]);
      } else {
        wrapper.appendChild(ind);
      }
    }

    function cancelPress() {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }

    function cleanup() {
      cancelPress();
      if (state) {
        state.card.classList.remove("anime_dragging_mobile");
        if (state.ghost) state.ghost.remove();
        removeIndicator(state.wrapper);
        document.body.classList.remove("anime_reorder_active");
        state = null;
      }
    }

    document.addEventListener(
      "touchstart",
      function (e) {
        if (!isMobile()) return;
        var card = e.target.closest(".m_card[data-anime-id]");
        if (!card) return;
        // Don't start drag if tapping edit button
        if (e.target.closest(".edit_btn")) return;

        var touch = e.touches[0];
        var startX = touch.clientX;
        var startY = touch.clientY;
        var moved = false;

        pressTimer = setTimeout(function () {
          pressTimer = null;
          if (moved) return;

          // Haptic feedback
          if (navigator.vibrate) navigator.vibrate(50);

          var wrapper = document.getElementById("mobile_card_list");
          if (!wrapper) return;
          var cards = wrapper.querySelectorAll(".m_card[data-anime-id]");
          var fromIdx = Array.prototype.indexOf.call(cards, card);
          if (fromIdx < 0) return;

          var rect = card.getBoundingClientRect();
          var ghost = card.cloneNode(true);
          ghost.className = "m_card anime_drag_ghost_mobile";
          ghost.style.width = rect.width + "px";
          ghost.style.top = rect.top + "px";
          ghost.style.left = rect.left + "px";
          document.body.appendChild(ghost);

          card.classList.add("anime_dragging_mobile");
          document.body.classList.add("anime_reorder_active");

          state = {
            card: card,
            ghost: ghost,
            wrapper: wrapper,
            fromIdx: fromIdx,
            offsetY: touch.clientY - rect.top,
            offsetX: touch.clientX - rect.left,
            dropIdx: fromIdx,
          };
        }, MOBILE_HOLD_MS);

        // Track movement to cancel press if user scrolls
        var onTouchMove = function (ev) {
          var t = ev.touches[0];
          if (!state) {
            // Not yet activated — check if user scrolled
            if (
              Math.abs(t.clientX - startX) > 10 ||
              Math.abs(t.clientY - startY) > 10
            ) {
              moved = true;
              cancelPress();
            }
          }
        };
        card.addEventListener("touchmove", onTouchMove, { passive: true });
        card.addEventListener(
          "touchend",
          function () {
            cancelPress();
            card.removeEventListener("touchmove", onTouchMove);
          },
          { once: true },
        );
        card.addEventListener(
          "touchcancel",
          function () {
            cleanup();
            card.removeEventListener("touchmove", onTouchMove);
          },
          { once: true },
        );
      },
      { passive: true },
    );

    document.addEventListener(
      "touchmove",
      function (e) {
        if (!state) return;
        e.preventDefault();
        var touch = e.touches[0];
        state.ghost.style.top = touch.clientY - state.offsetY + "px";
        state.ghost.style.left = touch.clientX - state.offsetX + "px";

        var dropIdx = getDropIdx(state.wrapper, touch.clientY);
        state.dropIdx = dropIdx;
        showIndicator(state.wrapper, dropIdx);
      },
      { passive: false },
    );

    document.addEventListener("touchend", function () {
      if (!state) return;
      var s = state;
      cleanup();

      var newList = reorderList(s.fromIdx, s.dropIdx);
      if (newList) persistOrder(newList);
    });
  })();

  /* ────────────────────────────────────────────
   *  Responsive re-render
   * ──────────────────────────────────────────── */

  var wasMobile = isMobile();
  window.addEventListener("resize", function () {
    var nowMobile = isMobile();
    if (nowMobile !== wasMobile) {
      wasMobile = nowMobile;
      if (lastList.length) render(lastList);
    }
  });

  /* ────────────────────────────────────────────
   *  Category tab drag-and-drop reorder
   *
   *  Desktop: click-and-drag on a tab.
   *  Mobile:  long-press on a tab.
   * ──────────────────────────────────────────── */

  var CAT_REORDER_API = "/api/anime/category/reorder/";
  var CAT_HOLD_MS = 400;
  var CAT_DEAD_ZONE = 4;

  var tabsNav = document.getElementById("category_tabs");

  function getCatWrappers() {
    return tabsNav ? tabsNav.querySelectorAll(".category_tab_wrapper") : [];
  }

  function catReorderList(wrappers, fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx === toIdx - 1) return null;
    var arr = Array.prototype.slice.call(wrappers);
    var item = arr.splice(fromIdx, 1)[0];
    var insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
    arr.splice(insertAt, 0, item);
    return arr;
  }

  async function persistCatOrder(orderedWrappers) {
    var ids = orderedWrappers.map(function (w) {
      return parseInt(w.dataset.categoryId, 10);
    });
    try {
      var resp = await fetch(CAT_REORDER_API, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRF(),
        },
        body: JSON.stringify({ order: ids }),
      });
      if (!resp.ok) throw new Error("Reorder failed");
      // Reload to reflect new tab order from server
      window.location.reload();
    } catch (_) {
      window.location.reload();
    }
  }

  // ─── Desktop: immediate drag on category tab ───
  if (tabsNav) {
    (function () {
      var state = null;

      function getCatDropIdx(clientX) {
        var wrappers = getCatWrappers();
        for (var i = 0; i < wrappers.length; i++) {
          var r = wrappers[i].getBoundingClientRect();
          if (clientX < r.left + r.width / 2) return i;
        }
        return wrappers.length;
      }

      function removeCatIndicator() {
        var el = tabsNav.querySelector(".cat_drop_indicator");
        if (el) el.remove();
      }

      function showCatIndicator(idx) {
        removeCatIndicator();
        var wrappers = getCatWrappers();
        var ind = document.createElement("div");
        ind.className = "cat_drop_indicator";
        if (idx < wrappers.length) {
          tabsNav.insertBefore(ind, wrappers[idx]);
        } else {
          tabsNav.appendChild(ind);
        }
      }

      tabsNav.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return;
        var wrapper = e.target.closest(".category_tab_wrapper");
        if (!wrapper) return;
        // Don't drag if clicking the edit button
        if (e.target.closest(".category_edit_btn")) return;

        e.preventDefault();

        var wrappers = getCatWrappers();
        var fromIdx = Array.prototype.indexOf.call(wrappers, wrapper);
        if (fromIdx < 0) return;

        var rect = wrapper.getBoundingClientRect();

        state = {
          wrapper: wrapper,
          fromIdx: fromIdx,
          startX: e.clientX,
          startY: e.clientY,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          ghost: null,
          dragging: false,
        };
      });

      document.addEventListener("mousemove", function (e) {
        if (!state) return;

        if (!state.dragging) {
          var dx = Math.abs(e.clientX - state.startX);
          var dy = Math.abs(e.clientY - state.startY);
          if (dx < CAT_DEAD_ZONE && dy < CAT_DEAD_ZONE) return;

          state.dragging = true;
          state.wrapper.classList.add("cat_dragging");
          document.body.classList.add("anime_reorder_active");

          var ghost = state.wrapper.cloneNode(true);
          ghost.className = "category_tab_wrapper cat_drag_ghost";
          ghost.style.width = state.wrapper.offsetWidth + "px";
          ghost.style.height = state.wrapper.offsetHeight + "px";
          document.body.appendChild(ghost);
          state.ghost = ghost;
        }

        e.preventDefault();
        state.ghost.style.top = e.clientY - state.offsetY + "px";
        state.ghost.style.left = e.clientX - state.offsetX + "px";
        showCatIndicator(getCatDropIdx(e.clientX));
      });

      document.addEventListener("mouseup", function (e) {
        if (!state) return;
        var s = state;
        state = null;

        if (!s.dragging) return;

        var dropIdx = getCatDropIdx(e.clientX);
        removeCatIndicator();
        s.wrapper.classList.remove("cat_dragging");
        s.ghost.remove();
        document.body.classList.remove("anime_reorder_active");

        var wrappers = getCatWrappers();
        var newOrder = catReorderList(wrappers, s.fromIdx, dropIdx);
        if (newOrder) persistCatOrder(newOrder);
      });
    })();

    // ─── Mobile: long-press on category tab ───
    (function () {
      var state = null;
      var pressTimer = null;

      function getCatDropIdx(clientX) {
        var wrappers = getCatWrappers();
        for (var i = 0; i < wrappers.length; i++) {
          var r = wrappers[i].getBoundingClientRect();
          if (clientX < r.left + r.width / 2) return i;
        }
        return wrappers.length;
      }

      function removeCatIndicator() {
        var el = tabsNav.querySelector(".cat_drop_indicator");
        if (el) el.remove();
      }

      function showCatIndicator(idx) {
        removeCatIndicator();
        var wrappers = getCatWrappers();
        var ind = document.createElement("div");
        ind.className = "cat_drop_indicator";
        if (idx < wrappers.length) {
          tabsNav.insertBefore(ind, wrappers[idx]);
        } else {
          tabsNav.appendChild(ind);
        }
      }

      function cancelPress() {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      }

      function cleanup() {
        cancelPress();
        if (state) {
          state.wrapper.classList.remove("cat_dragging");
          if (state.ghost) state.ghost.remove();
          removeCatIndicator();
          document.body.classList.remove("anime_reorder_active");
          state = null;
        }
      }

      tabsNav.addEventListener(
        "touchstart",
        function (e) {
          var wrapper = e.target.closest(".category_tab_wrapper");
          if (!wrapper) return;
          if (e.target.closest(".category_edit_btn")) return;

          var touch = e.touches[0];
          var startX = touch.clientX;
          var startY = touch.clientY;
          var moved = false;

          pressTimer = setTimeout(function () {
            pressTimer = null;
            if (moved) return;

            if (navigator.vibrate) navigator.vibrate(50);

            var wrappers = getCatWrappers();
            var fromIdx = Array.prototype.indexOf.call(wrappers, wrapper);
            if (fromIdx < 0) return;

            var rect = wrapper.getBoundingClientRect();
            var ghost = wrapper.cloneNode(true);
            ghost.className = "category_tab_wrapper cat_drag_ghost";
            ghost.style.width = rect.width + "px";
            ghost.style.height = rect.height + "px";
            ghost.style.top = rect.top + "px";
            ghost.style.left = rect.left + "px";
            document.body.appendChild(ghost);

            wrapper.classList.add("cat_dragging");
            document.body.classList.add("anime_reorder_active");

            state = {
              wrapper: wrapper,
              ghost: ghost,
              fromIdx: fromIdx,
              offsetX: touch.clientX - rect.left,
              offsetY: touch.clientY - rect.top,
              dropIdx: fromIdx,
            };
          }, CAT_HOLD_MS);

          var onTouchMove = function (ev) {
            var t = ev.touches[0];
            if (!state) {
              if (
                Math.abs(t.clientX - startX) > 10 ||
                Math.abs(t.clientY - startY) > 10
              ) {
                moved = true;
                cancelPress();
              }
            }
          };
          wrapper.addEventListener("touchmove", onTouchMove, {
            passive: true,
          });
          wrapper.addEventListener(
            "touchend",
            function () {
              cancelPress();
              wrapper.removeEventListener("touchmove", onTouchMove);
            },
            { once: true },
          );
          wrapper.addEventListener(
            "touchcancel",
            function () {
              cleanup();
              wrapper.removeEventListener("touchmove", onTouchMove);
            },
            { once: true },
          );
        },
        { passive: true },
      );

      document.addEventListener(
        "touchmove",
        function (e) {
          if (!state) return;
          e.preventDefault();
          var touch = e.touches[0];
          state.ghost.style.top = touch.clientY - state.offsetY + "px";
          state.ghost.style.left = touch.clientX - state.offsetX + "px";

          var dropIdx = getCatDropIdx(touch.clientX);
          state.dropIdx = dropIdx;
          showCatIndicator(dropIdx);
        },
        { passive: false },
      );

      document.addEventListener("touchend", function () {
        if (!state) return;
        var s = state;
        cleanup();

        var wrappers = getCatWrappers();
        var newOrder = catReorderList(wrappers, s.fromIdx, s.dropIdx);
        if (newOrder) persistCatOrder(newOrder);
      });
    })();
  }

  /* ────────────────────────────────────────────
   *  Tab click handlers & initial load
   * ──────────────────────────────────────────── */

  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var wrapper = btn.closest(".category_tab_wrapper");

      if (btn.classList.contains("active")) {
        // Toggle edit button visibility on the active tab
        if (wrapper) wrapper.classList.toggle("category_edit_visible");
        return;
      }

      // Hide any open edit buttons
      document
        .querySelectorAll(".category_edit_visible")
        .forEach(function (el) {
          el.classList.remove("category_edit_visible");
        });

      setActiveTab(btn);
      try {
        localStorage.setItem("active_category", btn.dataset.categoryId);
      } catch (_) {}
      loadCategory(btn.dataset.categoryId);
    });
  });

  if (tabs.length > 0) {
    var startTab = tabs[0];
    try {
      var savedId = localStorage.getItem("active_category");
      if (savedId) {
        var found = Array.prototype.find.call(tabs, function (t) {
          return t.dataset.categoryId === savedId;
        });
        if (found) startTab = found;
      }
    } catch (_) {}
    setActiveTab(startTab);
    loadCategory(startTab.dataset.categoryId);
  }

  /* ────────────────────────────────────────────
   *  Desktop comment tooltips
   *
   *  Built with DOM methods — no innerHTML with
   *  user content — to prevent XSS.
   * ──────────────────────────────────────────── */

  var activeTooltip = null;
  var hoverTimer = null;

  function removeTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  }

  function showTooltip(anchor) {
    var comment = anchor.getAttribute("data-comment");
    if (!comment) return;
    removeTooltip();

    var tip = document.createElement("div");
    tip.className = "season_comment_tooltip";

    var stem = document.createElement("div");
    stem.className = "season_comment_stem";
    tip.appendChild(stem);

    var header = document.createElement("div");
    header.className = "season_comment_header";
    header.textContent =
      (anchor.getAttribute("data-season") || "Season") + " Comment";
    tip.appendChild(header);

    var body = document.createElement("div");
    body.className = "season_comment_body";
    body.textContent = comment;
    tip.appendChild(body);

    var footer = document.createElement("div");
    footer.className = "season_comment_footer";
    var closeBtn = document.createElement("button");
    closeBtn.className = "season_comment_close_btn";
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    footer.appendChild(closeBtn);
    tip.appendChild(footer);

    document.body.appendChild(tip);
    activeTooltip = tip;

    /* Position */
    var rect = anchor.getBoundingClientRect();
    var stemH = 10;
    tip.style.visibility = "hidden";
    tip.style.display = "block";
    var tipRect = tip.getBoundingClientRect();
    tip.style.visibility = "";

    var left = rect.left + rect.width / 2 - tipRect.width / 2;
    if (left < 8) left = 8;
    if (left + tipRect.width > window.innerWidth - 8)
      left = window.innerWidth - tipRect.width - 8;

    tip.style.top = rect.bottom + stemH + window.scrollY + "px";
    tip.style.left = left + window.scrollX + "px";

    var stemLeft = rect.left + rect.width / 2 - left - 8;
    stem.style.left =
      Math.max(12, Math.min(stemLeft, tipRect.width - 28)) + "px";

    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      removeTooltip();
    });
  }

  document.addEventListener("mouseover", function (e) {
    if (isMobile()) return;
    if (activeTooltip && activeTooltip.contains(e.target)) {
      clearTimeout(hoverTimer);
      return;
    }
    var el = e.target.closest(".season_has_tooltip[data-comment]");
    if (el) {
      clearTimeout(hoverTimer);
      showTooltip(el);
    }
  });

  document.addEventListener("mouseout", function (e) {
    if (isMobile()) return;
    var fromAnchor = e.target.closest(".season_has_tooltip[data-comment]");
    var fromTooltip =
      activeTooltip &&
      (activeTooltip === e.target || activeTooltip.contains(e.target));
    if (fromAnchor || fromTooltip) {
      var related = e.relatedTarget;
      if (
        activeTooltip &&
        (activeTooltip === related || activeTooltip.contains(related))
      )
        return;
      if (
        related &&
        related.closest &&
        related.closest(".season_has_tooltip[data-comment]")
      )
        return;
      hoverTimer = setTimeout(removeTooltip, 150);
    }
  });

  document.addEventListener("click", function (e) {
    if (isMobile()) return;
    if (e.target.closest(".season_comment_close_btn")) return;
    var el = e.target.closest(".season_has_tooltip[data-comment]");
    if (el) {
      if (activeTooltip) removeTooltip();
      else showTooltip(el);
    } else if (activeTooltip && !activeTooltip.contains(e.target)) {
      removeTooltip();
    }
  });

  /* ────────────────────────────────────────────
   *  Mobile comment popups
   *
   *  Also built with DOM methods to avoid XSS.
   * ──────────────────────────────────────────── */

  var activeMobilePopup = null;

  function removeMobilePopup() {
    if (activeMobilePopup) {
      activeMobilePopup.remove();
      activeMobilePopup = null;
    }
  }

  document.addEventListener("click", function (e) {
    if (!isMobile()) return;

    if (
      activeMobilePopup &&
      !activeMobilePopup.contains(e.target) &&
      !e.target.closest(".m_season_has_popup[data-comment]")
    ) {
      removeMobilePopup();
      return;
    }
    if (e.target.closest(".m_season_popup_close")) {
      removeMobilePopup();
      return;
    }

    var el = e.target.closest(".m_season_has_popup[data-comment]");
    if (!el) return;
    removeMobilePopup();

    var overlay = document.createElement("div");
    overlay.className = "m_season_popup_overlay";

    var card = document.createElement("div");
    card.className = "m_season_popup_card";

    var title = document.createElement("div");
    title.className = "m_season_popup_title";
    title.textContent =
      (el.getAttribute("data-season") || "Season") + " Comment";

    var popupBody = document.createElement("div");
    popupBody.className = "m_season_popup_body";
    popupBody.textContent = el.getAttribute("data-comment");

    var closeBtn = document.createElement("button");
    closeBtn.className = "m_season_popup_close";
    closeBtn.type = "button";
    closeBtn.textContent = "Close";

    card.appendChild(title);
    card.appendChild(popupBody);
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    activeMobilePopup = overlay;

    requestAnimationFrame(function () {
      overlay.classList.add("m_popup_visible");
    });
  });
})();
