(function () {
  "use strict";

  var parts = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, "").split("/");
  var base = parts.indexOf("class-discussion");
  var teacherSlug = base >= 0 ? parts[base + 1] : "";
  var classSlug = base >= 0 ? parts[base + 2] : "";
  var picker = document.getElementById("class-picker");
  var pickerTitle = document.getElementById("class-picker-title");
  var pickerList = document.getElementById("class-picker-list");
  var login = document.getElementById("class-login");
  var loginTitle = document.getElementById("class-login-title");
  var loginSubtitle = document.getElementById("class-login-subtitle");
  var form = document.getElementById("class-login-form");
  var password = document.getElementById("class-password");
  var message = document.getElementById("class-login-message");
  var privateArea = document.getElementById("class-private");
  var privateTitle = document.getElementById("class-private-title");
  var rosterList = document.getElementById("class-roster-list");
  var refresh = document.getElementById("class-refresh");
  var discussion = document.getElementById("cd-app");
  var errorBox = document.getElementById("class-error");
  var teacher, course;

  function api(action) {
    var params = new URLSearchParams({ teacher: teacherSlug || "" });
    if (classSlug) params.set("class", classSlug);
    if (action) params.set("action", action);
    return "/api/class-portal?" + params.toString();
  }

  function element(tag, attributes, children) {
    var node = document.createElement(tag), key;
    for (key in attributes || {}) {
      if (key === "text") node.textContent = attributes[key];
      else node.setAttribute(key, attributes[key]);
    }
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  function showError(text) {
    picker.hidden = true;
    login.hidden = true;
    privateArea.hidden = true;
    errorBox.hidden = false;
    errorBox.replaceChildren(element("h1", { text: "Class portal unavailable" }), element("p", { text: text }));
  }

  function displayTitle(title) {
    return String(title || "").toLowerCase() === "fundamentals of western art history" ? "Fundamentals of Art History" : title;
  }

  function showPicker() {
    document.title = teacher.name + "’s Classes | Bridgewater YOU";
    pickerTitle.textContent = teacher.name + "’s Classes";
    pickerList.textContent = "";
    course = null;
    teacher.classes.forEach(function (item) {
      pickerList.appendChild(element("li", null, [element("a", {
        "class": "class-picker-card",
        href: "/class-discussion/" + encodeURIComponent(teacherSlug) + "/" + encodeURIComponent(item.slug)
      }, [element("b", { text: item.title }), element("span", { text: "Class portal, discussion, and registrants" })]) ]));
    });
    picker.hidden = false;
  }

  function configureClass() {
    var label = course.title;
    document.title = label + " | " + teacher.name + " | Bridgewater YOU";
    loginTitle.textContent = label + " Class Portal";
    loginSubtitle.textContent = "For enrolled students and teachers";
    privateTitle.textContent = label;
  }

  function loadDiscussion() {
    if (document.querySelector('script[data-class-portal-discussion]')) return;
    discussion.setAttribute("data-teacher-slug", teacherSlug);
    discussion.setAttribute("data-class-title", course.sourceTitle);
    discussion.setAttribute("data-back-url", "/class-discussion/" + encodeURIComponent(teacherSlug));
    discussion.setAttribute("data-back-text", "← Back to " + teacher.name + "’s classes");
    var script = document.createElement("script");
    script.src = "/assets/class-discussion.js";
    script.dataset.classPortalDiscussion = "true";
    document.body.appendChild(script);
  }

  function showRosters(data) {
    rosterList.textContent = "";
    data.classes.forEach(function (item) {
      var names = element("ul", { "class": "class-names" });
      if (item.registrants.length) {
        item.registrants.forEach(function (name) { names.appendChild(element("li", { text: name })); });
      } else {
        names.appendChild(element("li", { "class": "class-empty", text: "No registrants are listed yet." }));
      }
      rosterList.appendChild(element("section", { "class": "class-roster-card" }, [
        element("h3", { text: item.title }),
        element("p", { "class": "class-count", text: item.registrants.length + (item.registrants.length === 1 ? " registrant" : " registrants") }),
        names
      ]));
    });
  }

  function loadRosters() {
    refresh.disabled = true;
    refresh.textContent = "Refreshing…";
    return fetch(api(), { cache: "no-store" }).then(function (response) {
      if (response.status === 401) { showLogin("Your portal session has ended. Please enter the password again."); throw new Error("Your portal session has ended. Please enter the password again."); }
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.error || "The class roster could not be loaded.");
        showRosters(data);
      });
    }).catch(function (error) {
      if (!privateArea.hidden) rosterList.replaceChildren(element("p", { "class": "cd-status", role: "status", text: error.message || "The class roster could not be loaded." }));
    }).finally(function () {
      refresh.disabled = false;
      refresh.textContent = "Refresh rosters";
    });
  }

  function showPortal(data) {
    picker.hidden = true;
    login.hidden = true;
    errorBox.hidden = true;
    privateArea.hidden = false;
    loadDiscussion();
    if (data) showRosters(data); else loadRosters();
  }

  function showLogin(text) {
    picker.hidden = true;
    privateArea.hidden = true;
    errorBox.hidden = true;
    login.hidden = false;
    message.textContent = text || "";
    password.focus();
  }

  function checkSession() {
    return fetch(api(), { cache: "no-store" }).then(function (response) {
      if (response.status === 401) { showLogin(); return; }
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.error || "The class portal could not be loaded.");
        showPortal(data);
      });
    }).catch(function (error) { showError(error.message || "The class portal could not be loaded."); });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var button = form.querySelector("button");
    button.disabled = true;
    message.textContent = "Checking password…";
    fetch(api("login"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: password.value })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.error || "Unable to enter the portal.");
        password.value = "";
        message.textContent = "";
        showPortal();
      });
    }).catch(function (error) {
      message.textContent = error.message;
      password.focus();
    }).finally(function () { button.disabled = false; });
  });

  refresh.addEventListener("click", loadRosters);
  document.getElementById("class-logout").addEventListener("click", function () {
    fetch(api("logout"), { method: "POST" }).finally(function () { location.href = "/class-discussion/" + encodeURIComponent(teacherSlug); });
  });

  if (!teacherSlug) { showError("Please return to Class Discussion and choose an instructor."); return; }
  fetch(api("info"), { cache: "no-store" }).then(function (response) {
    return response.json().then(function (data) {
      if (!response.ok) throw new Error(data.error || "That instructor portal could not be found.");
      teacher = { name: data.teacher, slug: data.teacherSlug, classes: data.classes };
      if (!classSlug) { showPicker(); return; }
      course = teacher.classes.filter(function (item) { return item.slug === classSlug; })[0];
      if (!course) throw new Error("That class portal could not be found.");
      configureClass();
      checkSession();
    });
  }).catch(function (error) { showError(error.message || "The instructor portal could not be loaded."); });
})();
