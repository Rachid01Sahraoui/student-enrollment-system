const API_BASE = "http://localhost:8080";
const MAX_PER_COURSE = 3;
const STORAGE_KEY = "enrollhub-cnie";
const COURSE_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#22d3ee",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#14b8a6",
    "#e879f9"
];

const state = {
    currentCnie: "",
    student: null,
    courses: [],
    enrollments: [],
    courseCounts: {},
    charts: {},
    pendingCancel: null,
    lastFocusedElement: null,
    isInitialLoad: true
};

const elements = {};

const toastTheme = {
    success: { color: "#10b981", icon: "circle-check" },
    warning: { color: "#f59e0b", icon: "triangle-alert" },
    danger: { color: "#ef4444", icon: "circle-x" },
    info: { color: "#22d3ee", icon: "info" }
};

const centerTextPlugin = {
    id: "centerText",

    afterDraw(chart) {
        const config = chart.options.plugins?.centerText;

        /*
          Correction du problème "undefined":
          Comme le plugin est enregistré globalement, Chart.js l'exécute sur tous les graphiques.
          Donc on vérifie d'abord si le graphique possède vraiment une valeur à afficher au centre.
        */
        if (
            !config ||
            config === false ||
            config.display === false ||
            config.value === undefined ||
            config.value === null
        ) {
            return;
        }

        const { ctx, chartArea } = chart;

        if (!chartArea) return;

        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        const value = String(config.value);
        const label = config.label ? String(config.label) : "";

        ctx.save();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillStyle = config.color || "#f1f5f9";
        ctx.font = "800 26px Space Grotesk, sans-serif";
        ctx.fillText(value, centerX, label ? centerY - 8 : centerY);

        if (label) {
            ctx.fillStyle = config.subColor || "#64748b";
            ctx.font = "700 12px Inter, sans-serif";
            ctx.fillText(label, centerX, centerY + 18);
        }

        ctx.restore();
    }
};

if (window.Chart) {
    Chart.register(centerTextPlugin);
    Chart.defaults.color = "#64748b";
    Chart.defaults.borderColor = "rgba(255,255,255,0.05)";
    Chart.defaults.font.family = "Inter, sans-serif";
}

document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    bindEvents();
    renderSkeletons();
    refreshIcons();

    const savedCnie = localStorage.getItem(STORAGE_KEY);
    if (savedCnie) elements.cnieInput.value = savedCnie;
});

function cacheElements() {
    Object.assign(elements, {
        accessScreen: document.getElementById("access-screen"),
        dashboardScreen: document.getElementById("dashboard-screen"),
        cnieForm: document.getElementById("cnie-form"),
        cnieInput: document.getElementById("cnie-input"),
        accessButton: document.getElementById("access-button"),
        accessError: document.getElementById("access-error"),
        topbarName: document.getElementById("topbar-name"),
        chipName: document.getElementById("chip-name"),
        chipCnie: document.getElementById("chip-cnie"),
        avatar: document.getElementById("avatar"),
        logoutButton: document.getElementById("logout-button"),
        refreshButton: document.getElementById("refresh-button"),
        profileCard: document.getElementById("profile-card"),
        statsGrid: document.getElementById("stats-grid"),
        enrollmentsContainer: document.getElementById("enrollments-container"),
        coursesGrid: document.getElementById("courses-grid"),
        occupancyValue: document.getElementById("occupancy-value"),
        heroProgressCircle: document.getElementById("hero-progress-circle"),
        lastUpdated: document.getElementById("last-updated"),
        globalAlert: document.getElementById("global-alert"),
        modalBackdrop: document.getElementById("modal-backdrop"),
        modalTitle: document.getElementById("modal-title"),
        modalMessage: document.getElementById("modal-message"),
        modalConfirm: document.getElementById("modal-confirm"),
        modalCancel: document.getElementById("modal-cancel"),
        toastContainer: document.getElementById("toast-container")
    });
}

function bindEvents() {
    elements.cnieInput.addEventListener("input", () => {
        elements.cnieInput.value = elements.cnieInput.value.toUpperCase().replace(/\s+/g, "").trim();
        elements.accessError.textContent = "";
    });

    elements.cnieForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const cnie = elements.cnieInput.value.trim().toUpperCase();

        if (!cnie) {
            elements.accessError.textContent = "Veuillez saisir votre CNIE avant de continuer.";
            return;
        }

        await initializeDashboard(cnie);
    });

    elements.refreshButton.addEventListener("click", async () => {
        if (!state.currentCnie) return;
        await refreshDashboardData(true);
    });

    elements.logoutButton.addEventListener("click", logout);

    document.querySelectorAll(".nav-item").forEach((item) => {
        item.addEventListener("click", () => {
            document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
            item.classList.add("active");
            const target = document.getElementById(item.dataset.target);
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    elements.coursesGrid.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-enroll-course]");
        if (!button || button.disabled) return;
        const courseId = Number(button.dataset.enrollCourse);
        await handleEnroll(courseId, button);
    });

    elements.enrollmentsContainer.addEventListener("click", (event) => {
        const button = event.target.closest("[data-cancel-enrollment]");
        if (!button || button.disabled) return;
        const enrollmentId = Number(button.dataset.cancelEnrollment);
        const courseName = button.dataset.courseName || "ce cours";
        openModal(enrollmentId, courseName);
    });

    elements.modalCancel.addEventListener("click", closeModal);
    elements.modalConfirm.addEventListener("click", confirmCancelEnrollment);
    elements.modalBackdrop.addEventListener("click", (event) => {
        if (event.target === elements.modalBackdrop) closeModal();
    });
}

async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        method: options.method || "GET",
        headers: {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    };

    if (options.body) {
        config.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    let response;
    try {
        response = await fetch(url, config);
    } catch (error) {
        throw buildClientError(503, "Remote service unavailable", error);
    }

    const contentType = response.headers.get("content-type") || "";
    const hasBody = response.status !== 204;
    let payload = null;

    if (hasBody && contentType.includes("application/json")) {
        payload = await response.json();
    } else if (hasBody) {
        const text = await response.text();
        payload = text ? { message: text } : null;
    }

    if (!response.ok) {
        throw buildClientError(response.status, getApiMessage(payload, response.statusText), payload);
    }

    return payload;
}

function buildClientError(status, message, payload = null) {
    const error = new Error(message || "Une erreur est survenue.");
    error.status = status;
    error.payload = payload;
    return error;
}

function getApiMessage(payload, fallback = "Request failed") {
    if (!payload) return fallback;
    if (payload.message) return payload.message;
    if (payload.error) return payload.error;
    if (payload.fields) return Object.values(payload.fields).join(" • ");
    return fallback;
}

function loadStudentByCnie(cnie) {
    return apiFetch(`/api/students/cnie/${encodeURIComponent(cnie)}`);
}

function loadCourses() {
    return apiFetch("/api/courses");
}

function loadEnrollments(cnie) {
    return apiFetch(`/api/enrollments/me?cnie=${encodeURIComponent(cnie)}`);
}

async function loadCourseCounts() {
    const entries = await Promise.all(
        state.courses.map(async (course) => {
            try {
                const count = await apiFetch(`/api/enrollments/course/${course.id}/count`);
                return [course.id, Number(count) || 0];
            } catch (error) {
                console.warn(`Impossible de charger le compteur du cours ${course.id}`, error);
                return [course.id, 0];
            }
        })
    );
    state.courseCounts = Object.fromEntries(entries);
}

function enrollStudent(cnie, courseId) {
    return apiFetch("/api/enrollments", {
        method: "POST",
        body: {
            studentCnie: cnie,
            courseId
        }
    });
}

function cancelEnrollment(id) {
    return apiFetch(`/api/enrollments/${id}?cnie=${encodeURIComponent(state.currentCnie)}`, {
        method: "DELETE"
    });
}

async function initializeDashboard(cnie) {
    try {
        setAccessLoading(true);
        elements.accessError.textContent = "";
        state.currentCnie = cnie;
        state.student = await loadStudentByCnie(cnie);
        localStorage.setItem(STORAGE_KEY, cnie);
        showDashboard();
        await refreshDashboardData(false);
        showToast("success", "Profil chargé", "Votre dashboard EnrollHub est prêt.");
    } catch (error) {
        state.currentCnie = "";
        state.student = null;
        localStorage.removeItem(STORAGE_KEY);
        elements.accessError.textContent = humanizeError(error);
    } finally {
        setAccessLoading(false);
    }
}

async function refreshDashboardData(showSuccessToast = false) {
    try {
        setDashboardLoading(true);
        hideGlobalAlert();

        const [courses, enrollments] = await Promise.all([
            loadCourses(),
            loadEnrollments(state.currentCnie)
        ]);

        state.courses = Array.isArray(courses) ? courses : [];
        state.enrollments = Array.isArray(enrollments) ? enrollments : [];
        await loadCourseCounts();

        renderAll();
        if (showSuccessToast) showToast("success", "Synchronisé", "Les données ont été actualisées avec succès.");
    } catch (error) {
        showGlobalAlert("Impossible de synchroniser le dashboard", humanizeError(error));
        showToast("danger", "Erreur de synchronisation", humanizeError(error));
    } finally {
        setDashboardLoading(false);
        state.isInitialLoad = false;
    }
}

async function handleEnroll(courseId, button) {
    const course = state.courses.find((item) => Number(item.id) === Number(courseId));
    const courseName = course?.title || "ce cours";

    try {
        setButtonBusy(button, "Inscription...");
        await enrollStudent(state.currentCnie, courseId);
        showToast("success", "Inscription réussie", `Vous êtes maintenant inscrit à ${courseName}.`);
        await refreshDashboardData(false);
    } catch (error) {
        const type = error.status === 409 ? "warning" : "danger";
        showToast(type, "Inscription refusée", humanizeError(error));
    } finally {
        setButtonBusy(button, null);
    }
}

async function confirmCancelEnrollment() {
    if (!state.pendingCancel) return;

    try {
        setButtonBusy(elements.modalConfirm, "Annulation...");
        await cancelEnrollment(state.pendingCancel.id);
        const courseName = state.pendingCancel.courseName;
        closeModal();
        showToast("success", "Annulation réussie", `Votre inscription à ${courseName} a été annulée.`);
        await refreshDashboardData(false);
    } catch (error) {
        closeModal();
        showToast("danger", "Annulation refusée", humanizeError(error));
    } finally {
        setButtonBusy(elements.modalConfirm, null);
    }
}

function showDashboard() {
    elements.accessScreen.classList.add("hidden");
    elements.dashboardScreen.classList.remove("hidden");
    renderTopbar();
    renderSkeletons();
    refreshIcons();
}

function logout() {
    localStorage.removeItem(STORAGE_KEY);
    state.currentCnie = "";
    state.student = null;
    state.courses = [];
    state.enrollments = [];
    state.courseCounts = {};
    state.pendingCancel = null;
    destroyCharts();
    closeModal(false);
    elements.dashboardScreen.classList.add("hidden");
    elements.accessScreen.classList.remove("hidden");
    hideGlobalAlert();
    renderSkeletons();
    elements.cnieInput.focus();
    refreshIcons();
}

function renderAll() {
    renderTopbar();
    renderProfileCard();
    renderStats();
    renderEnrollments();
    renderCourses();
    renderCharts();
    renderLastUpdated();
    updateRadialProgress(calculateOccupancy());
    refreshIcons();
}

function renderTopbar() {
    const fullName = getStudentFullName();
    const initials = getInitials(fullName);

    elements.topbarName.textContent = state.student ? `Bonjour, ${fullName}` : "Bienvenue";
    elements.chipName.textContent = state.student ? fullName : "Student";
    elements.chipCnie.textContent = state.currentCnie || "CNIE";
    elements.avatar.textContent = initials;
}

function renderProfileCard() {
    const fullName = getStudentFullName();
    const email = state.student?.email || "Email non disponible";

    elements.profileCard.innerHTML = `
        <div class="profile-avatar" aria-hidden="true">${escapeHTML(getInitials(fullName))}</div>
        <div class="profile-info">
            <h3>${escapeHTML(fullName)}</h3>
            <p>${escapeHTML(email)}</p>
            <div class="profile-meta">
                <span class="status-pill active"><span class="pulse-dot"></span> Active Student</span>
                <span class="info-pill"><i data-lucide="id-card"></i> ${escapeHTML(state.currentCnie)}</span>
                <span class="info-pill"><i data-lucide="book-marked"></i> ${state.enrollments.length} inscription${state.enrollments.length > 1 ? "s" : ""}</span>
            </div>
        </div>
    `;
}

function renderStats() {
    const stats = computeStats();
    const cards = [
        {
            label: "Enrolled Courses",
            value: stats.enrolled,
            description: "Cours actuellement suivis",
            icon: "book-check",
            text: "#22d3ee",
            bg: "rgba(34, 211, 238, 0.15)"
        },
        {
            label: "Available Courses",
            value: stats.available,
            description: "Encore ouverts aux inscriptions",
            icon: "unlock-keyhole",
            text: "#10b981",
            bg: "rgba(16, 185, 129, 0.15)"
        },
        {
            label: "Full Courses",
            value: stats.full,
            description: "Capacité maximale atteinte",
            icon: "lock-keyhole",
            text: "#ef4444",
            bg: "rgba(239, 68, 68, 0.15)"
        },
        {
            label: "Cancelable",
            value: stats.cancelable,
            description: "Dans la fenêtre des 24 heures",
            icon: "timer-reset",
            text: "#f59e0b",
            bg: "rgba(245, 158, 11, 0.15)"
        }
    ];

    elements.statsGrid.innerHTML = cards.map((card) => `
        <article class="stat-card card" style="--metric-text:${card.text};--metric-bg:${card.bg};--metric-color:${card.text}">
            <div class="stat-head">
                <h3>${card.label}</h3>
                <span class="stat-icon"><i data-lucide="${card.icon}"></i></span>
            </div>
            <p class="stat-value">${card.value}</p>
            <p>${card.description}</p>
        </article>
    `).join("");
}

function renderEnrollments() {
    if (!state.enrollments.length) {
        elements.enrollmentsContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="clipboard-list"></i>
                <h3>Aucune inscription pour le moment</h3>
                <p>Choisissez un cours dans le catalogue pour commencer votre parcours académique.</p>
            </div>
        `;
        return;
    }

    const rows = state.enrollments.map((enrollment, index) => {
        const id = getEnrollmentId(enrollment);
        const courseName = getEnrollmentCourseName(enrollment);
        const date = getEnrollmentDate(enrollment);
        const deletable = isEnrollmentDeletable(enrollment);
        const color = COURSE_COLORS[index % COURSE_COLORS.length];
        const remaining = deletable ? getRemainingCancellationTime(date) : "Expiré";
        const statusClass = deletable ? "success" : "danger";
        const statusLabel = deletable ? "Cancelable" : "Locked";
        const actionLabel = deletable ? "Annuler" : "Locked after 24h";

        return `
            <div class="enrollments-row data">
                <div class="course-cell">
                    <span class="course-dot" style="background:${color};color:${color}"></span>
                    <div>
                        <strong>${escapeHTML(courseName)}</strong>
                        <span>Enrollment #${escapeHTML(String(id || index + 1))}</span>
                    </div>
                </div>
                <div class="date-cell">${formatDate(date)}</div>
                <div class="status-cell"><span class="badge ${statusClass}">${statusLabel}</span></div>
                <div class="remaining-time">${escapeHTML(remaining)}</div>
                <div class="action-cell">
                    <button
                        class="btn cancel-btn"
                        type="button"
                        data-cancel-enrollment="${escapeHTML(String(id))}"
                        data-course-name="${escapeHTML(courseName)}"
                        aria-label="Annuler l'inscription à ${escapeHTML(courseName)}"
                        ${deletable ? "" : "disabled"}
                    >
                        <i data-lucide="${deletable ? "trash-2" : "lock"}"></i>
                        ${actionLabel}
                    </button>
                </div>
            </div>
        `;
    }).join("");

    elements.enrollmentsContainer.innerHTML = `
        <div class="enrollments-table" role="table" aria-label="Liste des inscriptions">
            <div class="enrollments-row header" role="row">
                <div role="columnheader">Course Title</div>
                <div role="columnheader">Enrollment Date</div>
                <div role="columnheader">Status</div>
                <div role="columnheader">Remaining Time</div>
                <div role="columnheader">Action</div>
            </div>
            ${rows}
        </div>
    `;
}

function renderCourses() {
    if (!state.courses.length) {
        elements.coursesGrid.innerHTML = `
            <article class="empty-state card">
                <i data-lucide="book-open"></i>
                <h3>Aucun cours disponible</h3>
                <p>Le Course Service n’a retourné aucun cours pour le moment.</p>
            </article>
        `;
        return;
    }

    elements.coursesGrid.innerHTML = state.courses.map((course, index) => {
        const count = Number(state.courseCounts[course.id] || 0);
        const remaining = Math.max(MAX_PER_COURSE - count, 0);
        const percent = Math.min((count / MAX_PER_COURSE) * 100, 100);
        const full = isFull(course.id);
        const alreadyEnrolled = isStudentEnrolledInCourse(course);
        const status = getCourseStatus(count);
        const color = COURSE_COLORS[index % COURSE_COLORS.length];
        const credits = Number(course.credits || 0);
        const disabled = full || alreadyEnrolled;
        const buttonText = alreadyEnrolled ? "Already enrolled" : full ? "Full" : "Enroll";
        const buttonIcon = alreadyEnrolled ? "check" : full ? "lock" : "plus";

        return `
            <article class="course-card card" style="--course-color:${color}">
                <div class="course-card-header">
                    <div>
                        <h3 title="${escapeHTML(course.title || "Course")}">${escapeHTML(course.title || "Untitled course")}</h3>
                    </div>
                    <span class="badge ${status.className}">${status.label}</span>
                </div>
                <p>${escapeHTML(course.description || "Aucune description disponible pour ce cours.")}</p>
                <div class="course-metrics">
                    <span class="info-pill"><i data-lucide="award"></i> ${credits} crédits</span>
                    <span class="info-pill"><i data-lucide="users"></i> ${count}/${MAX_PER_COURSE} inscrits</span>
                </div>
                <div class="progress-shell" aria-label="Progression d'occupation ${Math.round(percent)}%">
                    <div class="progress-fill" style="--progress:${percent}%"></div>
                </div>
                <div class="course-card-footer">
                    <span class="seats-left">
                        <strong>${remaining}</strong>
                        place${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}
                    </span>
                    <button
                        class="btn btn-primary enroll-btn"
                        type="button"
                        data-enroll-course="${course.id}"
                        aria-label="S'inscrire au cours ${escapeHTML(course.title || "")}" 
                        ${disabled ? "disabled" : ""}
                    >
                        <i data-lucide="${buttonIcon}"></i>
                        ${buttonText}
                    </button>
                </div>
            </article>
        `;
    }).join("");
}

function renderCharts() {
    if (!window.Chart) return;

    destroyCharts();

    const lineCanvas = document.getElementById("line-chart");
    const doughnutCanvas = document.getElementById("doughnut-chart");
    const barCanvas = document.getElementById("bar-chart");
    const radarCanvas = document.getElementById("radar-chart");

    renderLineChart(lineCanvas);
    renderDoughnutChart(doughnutCanvas);
    renderBarChart(barCanvas);
    renderRadarChart(radarCanvas);
}

function renderLineChart(canvas) {
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, "rgba(99,102,241,0.42)");
    gradient.addColorStop(1, "rgba(99,102,241,0)");

    const activity = getEnrollmentActivityByDay();

    state.charts.line = new Chart(ctx, {
        type: "line",
        data: {
            labels: activity.labels,
            datasets: [{
                label: "Inscriptions",
                data: activity.values,
                borderColor: "#6366f1",
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 7,
                pointBackgroundColor: "#22d3ee",
                pointBorderWidth: 0
            }]
        },
        options: getBaseChartOptions({
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "rgba(255,255,255,0.05)" } },
                x: { grid: { display: false } }
            }
        })
    });
}

function renderDoughnutChart(canvas) {
    const ctx = canvas.getContext("2d");
    const totalCapacity = state.courses.length * MAX_PER_COURSE;
    const totalOccupancy = Object.values(state.courseCounts).reduce((sum, value) => sum + Number(value || 0), 0);
    const remaining = Math.max(totalCapacity - totalOccupancy, 0);

    state.charts.doughnut = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Occupied", "Free seats"],
            datasets: [{
                data: [totalOccupancy, remaining],
                backgroundColor: ["#6366f1", "#ef4444"],
                borderColor: "rgba(255,255,255,0.05)",
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: getBaseChartOptions({
            cutout: "70%",
            plugins: {
                legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } },
                centerText: {
                    value: String(state.enrollments.length),
                    label: "My enrollments",
                    color: "#f1f5f9",
                    subColor: "#64748b"
                }
            }
        })
    });
}

function renderBarChart(canvas) {
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, "#8b5cf6");
    gradient.addColorStop(1, "#6366f1");

    state.charts.bar = new Chart(ctx, {
        type: "bar",
        data: {
            labels: state.courses.map((course) => shortenLabel(course.title || "Course", 16)),
            datasets: [{
                label: "Étudiants inscrits",
                data: state.courses.map((course) => Number(state.courseCounts[course.id] || 0)),
                backgroundColor: gradient,
                borderRadius: 8,
                maxBarThickness: 46
            }]
        },
        options: getBaseChartOptions({
            scales: {
                y: { beginAtZero: true, suggestedMax: MAX_PER_COURSE, ticks: { precision: 0 }, grid: { color: "rgba(255,255,255,0.05)" } },
                x: { grid: { display: false } }
            }
        })
    });
}

function renderRadarChart(canvas) {
    const ctx = canvas.getContext("2d");
    const stats = computeStats();

    state.charts.radar = new Chart(ctx, {
        type: "radar",
        data: {
            labels: ["Available", "Almost full", "Full", "Cancelable", "My courses"],
            datasets: [{
                label: "Catalog Health",
                data: [stats.available, stats.almostFull, stats.full, stats.cancelable, stats.enrolled],
                backgroundColor: "rgba(34, 211, 238, 0.14)",
                borderColor: "#22d3ee",
                pointBackgroundColor: "#8b5cf6",
                pointBorderWidth: 0
            }]
        },
        options: getBaseChartOptions({
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: { precision: 0, backdropColor: "transparent" },
                    grid: { color: "rgba(255,255,255,0.06)" },
                    angleLines: { color: "rgba(255,255,255,0.05)" },
                    pointLabels: { color: "#94a3b8", font: { size: 11, weight: "700" } }
                }
            }
        })
    });
}

function getBaseChartOptions(overrides = {}) {
    return deepMerge({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
            legend: { labels: { color: "#64748b", usePointStyle: true } },
            tooltip: { enabled: false, external: externalTooltipHandler }
        }
    }, overrides);
}

function externalTooltipHandler(context) {
    const { chart, tooltip } = context;
    let tooltipEl = chart.canvas.parentNode.querySelector(".chart-tooltip");

    if (!tooltipEl) {
        tooltipEl = document.createElement("div");
        tooltipEl.className = "chart-tooltip";
        chart.canvas.parentNode.appendChild(tooltipEl);
    }

    if (tooltip.opacity === 0) {
        tooltipEl.style.opacity = 0;
        return;
    }

    const title = tooltip.title?.[0] || "Data";
    const rows = tooltip.body?.map((item) => escapeHTML(item.lines.join(" "))).join("<br>") || "";
    tooltipEl.innerHTML = `<strong>${escapeHTML(title)}</strong><span>${rows}</span>`;

    const rect = chart.canvas.getBoundingClientRect();
    tooltipEl.style.opacity = 1;
    tooltipEl.style.left = `${rect.left + window.scrollX + tooltip.caretX}px`;
    tooltipEl.style.top = `${rect.top + window.scrollY + tooltip.caretY}px`;
}

function destroyCharts() {
    Object.values(state.charts).forEach((chart) => {
        if (chart && typeof chart.destroy === "function") chart.destroy();
    });
    state.charts = {};
}

function updateRadialProgress(percent) {
    const circle = elements.heroProgressCircle;
    const circumference = 339.292;
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    const offset = circumference - (safePercent / 100) * circumference;

    elements.occupancyValue.textContent = `${Math.round(safePercent)}%`;
    circle.style.strokeDashoffset = offset;

    if (safePercent < 50) circle.style.stroke = "var(--success)";
    else if (safePercent < 80) circle.style.stroke = "var(--warning)";
    else circle.style.stroke = "var(--danger)";
}

function renderSkeletons() {
    elements.profileCard.innerHTML = `
        <div class="profile-avatar skeleton" aria-hidden="true"></div>
        <div class="profile-info" style="width:100%">
            <div class="skeleton skeleton-line medium"></div>
            <div class="skeleton skeleton-line short"></div>
            <div class="skeleton skeleton-line full"></div>
        </div>
    `;

    elements.statsGrid.innerHTML = Array.from({ length: 4 }).map(() => `
        <article class="stat-card card skeleton-card">
            <div class="skeleton skeleton-line short"></div>
            <div class="skeleton skeleton-line medium" style="height:38px"></div>
            <div class="skeleton skeleton-line full"></div>
        </article>
    `).join("");

    elements.enrollmentsContainer.innerHTML = `
        <div style="padding:18px">
            ${Array.from({ length: 5 }).map(() => `<div class="skeleton skeleton-line full" style="height:38px;margin-bottom:14px"></div>`).join("")}
        </div>
    `;

    elements.coursesGrid.innerHTML = Array.from({ length: 6 }).map(() => `
        <article class="course-card card skeleton-card">
            <div class="skeleton skeleton-line medium"></div>
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line short"></div>
        </article>
    `).join("");
}

function setAccessLoading(isLoading) {
    elements.accessButton.disabled = isLoading;
    elements.accessButton.innerHTML = isLoading
        ? `<i class="spin" data-lucide="loader-circle"></i><span>Vérification...</span>`
        : `<span>Continuer</span><i data-lucide="arrow-right"></i>`;
    refreshIcons();
}

function setDashboardLoading(isLoading) {
    elements.refreshButton.disabled = isLoading;
    const icon = elements.refreshButton.querySelector("svg");
    if (icon) icon.classList.toggle("spin", isLoading);
    if (isLoading && state.isInitialLoad) renderSkeletons();
}

function setButtonBusy(button, label) {
    if (!button) return;

    if (label) {
        button.dataset.originalHtml = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<i class="spin" data-lucide="loader-circle"></i>${label}`;
    } else if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
        button.disabled = false;
        delete button.dataset.originalHtml;
    }

    refreshIcons();
}

function showGlobalAlert(title, message) {
    elements.globalAlert.classList.remove("hidden");
    elements.globalAlert.innerHTML = `
        <i data-lucide="circle-alert"></i>
        <div>
            <strong>${escapeHTML(title)}</strong>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
    refreshIcons();
}

function hideGlobalAlert() {
    elements.globalAlert.classList.add("hidden");
    elements.globalAlert.innerHTML = "";
}

function openModal(enrollmentId, courseName) {
    state.pendingCancel = { id: enrollmentId, courseName };
    state.lastFocusedElement = document.activeElement;
    elements.modalTitle.textContent = "Confirmer l’annulation";
    elements.modalMessage.textContent = `Are you sure you want to cancel your enrollment in ${courseName}? This action is only allowed during the first 24 hours after enrollment.`;
    elements.modalBackdrop.classList.remove("hidden");
    elements.modalBackdrop.setAttribute("aria-hidden", "false");
    document.addEventListener("keydown", trapModalFocus);
    setTimeout(() => elements.modalCancel.focus(), 0);
    refreshIcons();
}

function closeModal(restoreFocus = true) {
    elements.modalBackdrop.classList.add("hidden");
    elements.modalBackdrop.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", trapModalFocus);
    state.pendingCancel = null;

    if (elements.modalConfirm.dataset.originalHtml) setButtonBusy(elements.modalConfirm, null);
    if (restoreFocus && state.lastFocusedElement && typeof state.lastFocusedElement.focus === "function") {
        state.lastFocusedElement.focus();
    }
}

function trapModalFocus(event) {
    if (elements.modalBackdrop.classList.contains("hidden")) return;

    if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
    }

    if (event.key !== "Tab") return;

    const focusable = elements.modalBackdrop.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function showToast(type, title, message) {
    const theme = toastTheme[type] || toastTheme.info;
    const toast = document.createElement("article");
    toast.className = `toast ${type}`;
    toast.style.setProperty("--toast-color", theme.color);
    toast.innerHTML = `
        <span class="toast-icon"><i data-lucide="${theme.icon}"></i></span>
        <div>
            <strong>${escapeHTML(title)}</strong>
            <p>${escapeHTML(message)}</p>
        </div>
        <button class="toast-close" type="button" aria-label="Fermer la notification">
            <i data-lucide="x"></i>
        </button>
        <span class="toast-progress"></span>
    `;

    const removeToast = () => {
        toast.classList.add("exiting");
        setTimeout(() => toast.remove(), 240);
    };

    toast.querySelector(".toast-close").addEventListener("click", removeToast);
    elements.toastContainer.appendChild(toast);
    refreshIcons();
    setTimeout(removeToast, 4000);
}

function renderLastUpdated() {
    elements.lastUpdated.textContent = `Synchronisé à ${new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).format(new Date())}`;
}

function computeStats() {
    const counts = state.courses.map((course) => Number(state.courseCounts[course.id] || 0));
    return {
        enrolled: state.enrollments.length,
        available: counts.filter((count) => count < MAX_PER_COURSE).length,
        almostFull: counts.filter((count) => count === MAX_PER_COURSE - 1).length,
        full: counts.filter((count) => count >= MAX_PER_COURSE).length,
        cancelable: state.enrollments.filter(isEnrollmentDeletable).length
    };
}

function calculateOccupancy() {
    if (!state.courses.length) return 0;
    const totalCapacity = state.courses.length * MAX_PER_COURSE;
    const totalOccupied = Object.values(state.courseCounts).reduce((sum, count) => sum + Number(count || 0), 0);
    return (totalOccupied / totalCapacity) * 100;
}

function getCourseStatus(count) {
    if (count >= MAX_PER_COURSE) return { label: "Full", className: "danger" };
    if (count === MAX_PER_COURSE - 1) return { label: "Almost full", className: "warning" };
    return { label: "Available", className: "success" };
}

function isFull(courseId) {
    return Number(state.courseCounts[courseId] || 0) >= MAX_PER_COURSE;
}

function isStudentEnrolledInCourse(course) {
    const courseId = Number(course.id);
    const courseTitle = normalizeText(course.title || course.name || "");

    return state.enrollments.some((enrollment) => {
        const enrollmentCourseId = Number(enrollment.courseId || enrollment.course?.id || enrollment.courseID || 0);
        const enrollmentCourseName = normalizeText(getEnrollmentCourseName(enrollment));
        return (enrollmentCourseId && enrollmentCourseId === courseId) || (courseTitle && enrollmentCourseName === courseTitle);
    });
}

function getEnrollmentActivityByDay() {
    const days = Array.from({ length: 7 }).map((_, offset) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - offset));
        date.setHours(0, 0, 0, 0);
        return date;
    });

    const labels = days.map((date) => new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date));
    const values = days.map((day) => {
        return state.enrollments.filter((enrollment) => {
            const date = new Date(getEnrollmentDate(enrollment));
            return date.toDateString() === day.toDateString();
        }).length;
    });

    return { labels, values };
}

function getStudentFullName() {
    if (!state.student) return "Student";
    const fullName = [state.student.firstName, state.student.lastName].filter(Boolean).join(" ").trim();
    return fullName || state.student.name || "Student";
}

function getEnrollmentId(enrollment) {
    return enrollment.enrollmentId ?? enrollment.id ?? enrollment.enrollment_id ?? null;
}

function getEnrollmentCourseName(enrollment) {
    return enrollment.courseName || enrollment.courseTitle || enrollment.course?.title || enrollment.title || "Cours sans titre";
}

function getEnrollmentDate(enrollment) {
    return enrollment.date || enrollment.enrollmentDate || enrollment.enrollment_date || enrollment.createdAt || new Date().toISOString();
}

function isEnrollmentDeletable(enrollment) {
    if (typeof enrollment.deletable === "boolean") return enrollment.deletable;
    if (typeof enrollment.cancelable === "boolean") return enrollment.cancelable;
    return isWithin24h(getEnrollmentDate(enrollment));
}

function isWithin24h(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return false;
    const diff = Date.now() - date.getTime();
    return diff >= 0 && diff < 24 * 60 * 60 * 1000;
}

function getRemainingCancellationTime(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "Indisponible";
    const end = date.getTime() + 24 * 60 * 60 * 1000;
    const remaining = Math.max(end - Date.now(), 0);
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return remaining <= 0 ? "Expiré" : `${hours}h ${minutes}min`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "Date invalide";
    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function getInitials(fullName = "") {
    const words = fullName.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "--";
    return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");
}

function humanizeError(error) {
    const message = error?.message || "Une erreur inattendue est survenue.";
    const dictionary = {
        "Failed to fetch": "Impossible de joindre l’API Gateway. Vérifiez que le backend fonctionne sur http://localhost:8080.",
        "Student not found": "Étudiant introuvable. Vérifiez le CNIE saisi.",
        "Course not found": "Cours introuvable.",
        "Course capacity reached": "Ce cours est déjà complet.",
        "Student already enrolled in this course": "Vous êtes déjà inscrit à ce cours.",
        "Cancellation period expired": "La période d’annulation de 24 heures est expirée.",
        "Remote service unavailable": "Un microservice est temporairement indisponible. Vérifiez Eureka et les services."
    };

    return dictionary[message] || message;
}

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function shortenLabel(label, maxLength) {
    const value = String(label || "");
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function deepMerge(target, source) {
    const output = { ...target };

    Object.keys(source).forEach((key) => {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
            output[key] = deepMerge(output[key] || {}, source[key]);
        } else {
            output[key] = source[key];
        }
    });

    return output;
}

function refreshIcons() {
    if (window.lucide) lucide.createIcons();
}
