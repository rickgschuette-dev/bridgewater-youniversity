(function () {
  "use strict";
  var login = document.getElementById("rick-login");
  var privateArea = document.getElementById("rick-private");
  var form = document.getElementById("rick-login-form");
  var password = document.getElementById("rick-password");
  var message = document.getElementById("rick-login-message");
  var rosterList = document.getElementById("rick-roster-list");
  var refresh = document.getElementById("rick-refresh");
  var discussion = document.getElementById("cd-app");
  var courseSlug = decodeURIComponent(location.pathname).replace(/\/+$/, "").split("/").pop();
  var courses = {
    "fundamentals-of-art-history": { title: "Fundamentals of Art History", classTitle: "Fundamentals of Western Art History" },
    "comparative-religions": { title: "Comparative Religions", classTitle: "Comparative Religions" },
    "fundamentals-of-ai": { title: "Fundamentals of AI", classTitle: "Fundamentals of AI" },
    "learn-your-smartphone": { title: "Learn Your Smartphone", classTitle: "Learn Your Smartphone" }
  };
  var course = courses[courseSlug];
  var API = "/api/rick-portal?class=" + encodeURIComponent(courseSlug);

  if (!course) {
    document.getElementById("rick-login-title").textContent = "Class portal not found";
    document.getElementById("rick-course-subtitle").textContent = "Please return to Rick Schuette’s class list and choose a class.";
    message.textContent = "This class portal is not available.";
    password.disabled = true;
    form.querySelector("button").disabled = true;
    return;
  }

  document.getElementById("rick-course-subtitle").textContent = course.title + " — for enrolled students and teachers";
  document.getElementById("rick-private-title").textContent = course.title;
  document.title = course.title + " | Rick Schuette | Bridgewater YOU";

  function element(tag, attributes, children) {
    var node = document.createElement(tag), key;
    for (key in attributes || {}) {
      if (key === "text") node.textContent = attributes[key];
      else node.setAttribute(key, attributes[key]);
    }
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  function loadDiscussion() {
    if (document.querySelector('script[data-rick-discussion]')) return;
    discussion.setAttribute("data-class-title", course.classTitle);
    var script = document.createElement("script");
    script.src = "/assets/class-discussion.js";
    script.dataset.rickDiscussion = "true";
    document.body.appendChild(script);
  }

  function showRosters(data) {
    rosterList.textContent = "";
    data.classes.forEach(function (course) {
      var names = element("ul", { "class": "rick-names" });
      if (course.registrants.length) {
        course.registrants.forEach(function (name) { names.appendChild(element("li", { text: name })); });
      } else {
        names.appendChild(element("li", { "class": "rick-empty", text: "No registrants are listed yet." }));
      }
      rosterList.appendChild(element("section", { "class": "rick-roster-card" }, [
        element("h3", { text: course.title }),
        element("p", { "class": "rick-count", text: course.registrants.length + (course.registrants.length === 1 ? " registrant" : " registrants") }),
        names
      ]));
    });
  }

  function loadRosters() {
    refresh.disabled = true;
    refresh.textContent = "Refreshing…";
    return fetch(API, { cache: "no-store" }).then(function (response) {
      if (response.status === 401) { showLogin(); throw new Error("Your portal session has ended. Please enter the password again."); }
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.error || "The class rosters could not be loaded.");
        showRosters(data);
      });
    }).catch(function (error) {
      if (!privateArea.hidden) rosterList.replaceChildren(element("p", { "class": "cd-status", role: "status", text: error.message || "The class rosters could not be loaded." }));
    }).finally(function () {
      refresh.disabled = false;
      refresh.textContent = "Refresh rosters";
    });
  }

  function showPortal(initialRosters) {
    login.hidden = true;
    privateArea.hidden = false;
    loadDiscussion();
    if (initialRosters) showRosters(initialRosters);
    else loadRosters();
  }

  function showLogin() {
    privateArea.hidden = true;
    login.hidden = false;
    message.textContent = "Your portal session has ended. Please enter the password again.";
    password.focus();
  }

  function checkSession() {
    return fetch(API, { cache: "no-store" }).then(function (response) {
      if (!response.ok) return;
      return response.json().then(function (data) { showPortal(data); });
    }).catch(function () { /* The password form provides the user-facing error. */ });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var button = form.querySelector("button");
    button.disabled = true;
    message.textContent = "Checking password…";
    fetch(API + "&action=login", {
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
  document.getElementById("rick-logout").addEventListener("click", function () {
    fetch(API + "&action=logout", { method: "POST" }).finally(function () {
      location.href = "/rick-schuette";
    });
  });
  checkSession();
})();

