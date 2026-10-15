/*************************************************
 * ADMIN DASHBOARD
 *************************************************/

const API_URL =
    "https://script.google.com/macros/s/AKfycbw4tzbbumpOpqtPD9e1TUBgRi9EX6-c4nWPIBIyK2vlJdLsdfLRrMC7N0rUiK5fnFpf/exec";


let allIssues = [];


/*************************************************
 * เริ่มต้น Dashboard
 *************************************************/

document.addEventListener("DOMContentLoaded", function () {
    if (typeof checkAdmin === "function") {
        if (!checkAdmin()) {
            return;
        }
    }

    setupAdminInfo();
    setupEvents();
    loadIssues();
});


/*************************************************
 * แสดงชื่อ Admin
 *************************************************/

function setupAdminInfo() {
    const adminUsername =
        document.getElementById("adminUsername");

    const user = getCurrentUser();

    if (adminUsername && user) {
        adminUsername.textContent = user.username;
    }
}


/*************************************************
 * ผูกปุ่มและตัวกรอง
 *************************************************/

function setupEvents() {
    const logoutButton =
        document.getElementById("logoutButton");

    const refreshButton =
        document.getElementById("refreshButton");

    const statusFilter =
        document.getElementById("statusFilter");

    const departmentFilter =
        document.getElementById("departmentFilter");

    const searchInput =
        document.getElementById("searchInput");

    const closeModalButton =
        document.getElementById("closeModalButton");

    const closeDetailButton =
        document.getElementById("closeDetailButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            logout();
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", function () {
            loadIssues();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", function () {
            renderIssues();
        });
    }

    if (departmentFilter) {
        departmentFilter.addEventListener("change", function () {
            renderIssues();
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            renderIssues();
        });
    }

    if (closeModalButton) {
        closeModalButton.addEventListener("click", closeModal);
    }

    if (closeDetailButton) {
        closeDetailButton.addEventListener("click", closeModal);
    }

    const issueModal =
        document.getElementById("issueModal");

    if (issueModal) {
        issueModal.addEventListener("click", function (event) {
            if (event.target === issueModal) {
                closeModal();
            }
        });
    }
}


/*************************************************
 * โหลดข้อมูลจาก Google Apps Script
 *************************************************/

async function loadIssues() {
    showLoading(true);
    showError(false);

    try {
        const response = await fetch(
            API_URL + "?action=getIssues&time=" + Date.now(),
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                "HTTP Error: " + response.status
            );
        }

        const result = await response.json();

        if (Array.isArray(result)) {
            allIssues = result;
        } else if (Array.isArray(result.data)) {
            allIssues = result.data;
        } else if (Array.isArray(result.issues)) {
            allIssues = result.issues;
        } else {
            allIssues = [];
        }

        updateSummary();
        renderIssues();

    } catch (error) {
        console.error("โหลดข้อมูลไม่สำเร็จ:", error);

        allIssues = [];
        updateSummary();
        renderIssues();

        showError(true);
    } finally {
        showLoading(false);
    }
}


/*************************************************
 * แสดง Loading
 *************************************************/

function showLoading(show) {
    const loadingMessage =
        document.getElementById("loadingMessage");

    if (loadingMessage) {
        loadingMessage.hidden = !show;
    }
}


/*************************************************
 * แสดง Error
 *************************************************/

function showError(show) {
    const errorMessage =
        document.getElementById("errorMessage");

    if (errorMessage) {
        errorMessage.hidden = !show;
    }
}


/*************************************************
 * สรุปจำนวนรายการ
 *************************************************/

function updateSummary() {
    const totalIssues = document.getElementById("totalIssues");
    const pendingIssues = document.getElementById("pendingIssues");
    const completedIssues = document.getElementById("completedIssues");

    // Trim ช่องว่างและ normalize สถานะก่อนนับ เพื่อป้องกันค่าจาก Sheet มีช่องว่างติดมา
    const normalizeStatus = function (issue) {
        return getIssueValue(issue, "STATUS").trim().replace(/\\s+/g, " ");
    };

    const pendingCount = allIssues.filter(function (issue) {
        return normalizeStatus(issue) === "รอดำเนินการ";
    }).length;

    const completedCount = allIssues.filter(function (issue) {
        const status = normalizeStatus(issue);
        return status === "เสร็จสิ้น" || status === "ดำเนินการแล้ว";
    }).length;

    if (totalIssues) totalIssues.textContent = allIssues.length;
    if (pendingIssues) pendingIssues.textContent = pendingCount;
    if (completedIssues) completedIssues.textContent = completedCount;
}


/*************************************************
 * แสดงรายการในตาราง
 *************************************************/

function renderIssues() {
    const tableBody =
        document.getElementById("issueTableBody");

    if (!tableBody) {
        return;
    }

    const statusFilter =
        document.getElementById("statusFilter");

    const departmentFilter =
        document.getElementById("departmentFilter");

    const searchInput =
        document.getElementById("searchInput");

    const selectedStatus =
        statusFilter ? statusFilter.value : "all";

    const selectedDepartment =
        departmentFilter ? departmentFilter.value : "all";

    const keyword =
        searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

    const filteredIssues = allIssues.filter(function (issue) {
        const ticket = getIssueValue(issue, "TICKET");
        const dateTime = getIssueValue(issue, "DATE/TIME");
        const user = getIssueValue(issue, "USER");
        const reporterName = getIssueValue(issue, "REPORTERNAME") || user;
        const department = getIssueValue(issue, "DEPARTMENT");
        const subject = getIssueValue(issue, "SUBJECT");
        const description = getIssueValue(issue, "DESCRIPTION");
        const status = getIssueValue(issue, "STATUS");

        const matchesStatus =
            selectedStatus === "all" ||
            status === selectedStatus ||
            (selectedStatus === "เสร็จสิ้น" && status === "ดำเนินการแล้ว");

        const matchesDepartment =
            selectedDepartment === "all" ||
            department === selectedDepartment;

        const searchText = [
            ticket,
            dateTime,
            user,
            department,
            subject,
            description,
            status
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            keyword === "" ||
            searchText.includes(keyword);

        return (
            matchesStatus &&
            matchesDepartment &&
            matchesSearch
        );
    });

    tableBody.innerHTML = "";

    if (filteredIssues.length === 0) {
        const row = document.createElement("tr");

        const cell = document.createElement("td");
        cell.colSpan = 9;
        cell.className = "empty-message";
        cell.textContent = "ไม่พบรายการแจ้งปัญหา";

        row.appendChild(cell);
        tableBody.appendChild(row);

        return;
    }

    filteredIssues.forEach(function (issue) {
        const row = document.createElement("tr");

        const ticket = getIssueValue(issue, "TICKET");
        const dateTime = getIssueValue(issue, "DATE/TIME");
        const user = getIssueValue(issue, "USER");
        const reporterName = getIssueValue(issue, "REPORTERNAME") || user;
        const department = getIssueValue(issue, "DEPARTMENT");
        const subject = getIssueValue(issue, "SUBJECT");
        const description = getIssueValue(issue, "DESCRIPTION");
        const status = getIssueValue(issue, "STATUS");
        const image = getIssueValue(issue, "IMAGE");

        addCell(row, ticket);
        addCell(row, formatDate(dateTime));
        addCell(row, reporterName);
        addCell(row, department);
        addCell(row, subject);
        addCell(row, description);

        const statusCell = document.createElement("td");
        const statusSelect = document.createElement("select");
        statusSelect.className = "issue-status-select";
        statusSelect.setAttribute("aria-label", "เปลี่ยนสถานะ Ticket " + ticket);

        [
            { value: "รอดำเนินการ", label: "รอดำเนินการ" },
            { value: "เสร็จสิ้น", label: "เสร็จสิ้น" }
        ].forEach(function (optionData) {
            const option = document.createElement("option");
            option.value = optionData.value;
            option.textContent = optionData.label;
            statusSelect.appendChild(option);
        });

        // รองรับข้อมูลเก่าที่ใช้คำว่า "ดำเนินการแล้ว"
        statusSelect.value =
            status === "ดำเนินการแล้ว" ? "เสร็จสิ้น" : status;

        statusSelect.addEventListener("change", function () {
            updateIssueStatus(issue, ticket, status, statusSelect);
        });

        statusCell.appendChild(statusSelect);
        row.appendChild(statusCell);

        const imageCell = document.createElement("td");

        if (image) {
            const imageLink = document.createElement("a");
            imageLink.href = image;
            imageLink.target = "_blank";
            imageLink.rel = "noopener noreferrer";
            imageLink.textContent = "ดูรูปภาพ";

            imageCell.appendChild(imageLink);
        } else {
            imageCell.textContent = "-";
        }

        row.appendChild(imageCell);

        const actionCell = document.createElement("td");

        const detailButton = document.createElement("button");
        detailButton.type = "button";
        detailButton.textContent = "รายละเอียด";
        detailButton.className = "detail-button";

        detailButton.addEventListener("click", function () {
            openIssueDetail(issue);
        });

        actionCell.appendChild(detailButton);
        row.appendChild(actionCell);

        tableBody.appendChild(row);
    });
}


/*************************************************
 * เปลี่ยนสถานะรายการแจ้งปัญหา
 * ต้องมี action=updateStatus รองรับใน Apps Script
 *************************************************/
function updateIssueStatus(issue, ticket, previousStatus, selectElement) {
    const nextStatus = selectElement.value;
    if (nextStatus === previousStatus) return;

    selectElement.disabled = true;

    const iframeName = "statusUpdateFrame_" + Date.now();
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.style.display = "none";

    const form = document.createElement("form");
    form.method = "POST";
    form.action = API_URL;
    form.target = iframeName;
    form.style.display = "none";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "payload";
    input.value = JSON.stringify({
        action: "updateStatus",
        ticket: ticket,
        status: nextStatus
    });
    form.appendChild(input);

    let handled = false;
    function cleanup() {
        setTimeout(function () {
            if (form.parentNode) form.parentNode.removeChild(form);
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 500);
    }

    iframe.addEventListener("load", async function () {
        if (handled) return;
        handled = true;
        cleanup();

        await new Promise(function (resolve) {
            setTimeout(resolve, 1200);
        });
        await loadIssues();

        const savedIssue = allIssues.find(function (item) {
            return getIssueValue(item, "TICKET") === ticket;
        });
        const savedStatus = savedIssue ? getIssueValue(savedIssue, "STATUS") : "";

        if (
            savedStatus === nextStatus ||
            (nextStatus === "เสร็จสิ้น" && savedStatus === "ดำเนินการแล้ว")
        ) {
            alert("บันทึกสถานะ Ticket " + ticket + " สำเร็จ");
        } else {
            alert("ยังบันทึกสถานะไม่ได้ กรุณาตรวจสอบว่า Apps Script รองรับ action=updateStatus แล้วหรือยัง");
        }
        selectElement.disabled = false;
    }, { once: true });

    document.body.appendChild(iframe);
    document.body.appendChild(form);

    try {
        form.submit();
    } catch (error) {
        cleanup();
        selectElement.disabled = false;
        selectElement.value = previousStatus;
        alert("ส่งคำขอเปลี่ยนสถานะไม่สำเร็จ");
    }
}


/*************************************************
 * เพิ่ม Cell
 *************************************************/

function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value || "-";
    row.appendChild(cell);
}


/*************************************************
 * อ่านค่าจาก Object รองรับหลายชื่อ
 *************************************************/

function getIssueValue(issue, field) {
    const aliases = {
        "TICKET": ["TICKET", "ticket"],
        "DATE/TIME": ["DATE/TIME", "DATE", "dateTime", "datetime"],
        "USER": ["USER", "user", "username"],
        "DEPARTMENT": ["DEPARTMENT", "department", "dept"],
        "SUBJECT": ["SUBJECT", "subject", "title"],
        "DESCRIPTION": ["DESCRIPTION", "description", "detail"],
        "REPORTERNAME": ["ชื่อผู้แจ้งปัญหา", "NameReport", "NAMEREPORT", "REPORTERNAME", "reporterName", "nameReport"],
        "STATUS": ["STATUS", "status"],
        "IMAGE": ["IMAGE", "image", "imageUrl"]
    };

    const keys = aliases[field] || [field];

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (
            issue[key] !== undefined &&
            issue[key] !== null
        ) {
            return String(issue[key]);
        }
    }

    return "";
}


/*************************************************
 * Status Badge
 *************************************************/

function createStatusBadge(status) {
    const badge = document.createElement("span");

    badge.className = "status-badge";

    if (status === "รอดำเนินการ") {
        badge.classList.add("status-pending");
    } else if (status === "กำลังดำเนินการ") {
        badge.classList.add("status-progress");
    } else if (status === "ดำเนินการแล้ว") {
        badge.classList.add("status-completed");
    } else if (status === "ยกเลิก") {
        badge.classList.add("status-cancelled");
    }

    badge.textContent = status || "-";

    return badge;
}


/*************************************************
 * เปิดรายละเอียด
 *************************************************/

function openIssueDetail(issue) {
    const modal =
        document.getElementById("issueModal");

    const detail =
        document.getElementById("issueDetail");

    if (!modal || !detail) {
        return;
    }

    detail.innerHTML = "";

    const fields = [
        ["Ticket", getIssueValue(issue, "TICKET")],
        ["วันที่แจ้ง", formatDate(getIssueValue(issue, "DATE/TIME"))],
        ["ชื่อผู้แจ้งปัญหา", getIssueValue(issue, "REPORTERNAME") || getIssueValue(issue, "USER")],
        ["แผนก", getIssueValue(issue, "DEPARTMENT")],
        ["หัวข้อ", getIssueValue(issue, "SUBJECT")],
        ["รายละเอียด", getIssueValue(issue, "DESCRIPTION")],
        ["สถานะ", getIssueValue(issue, "STATUS")],
        ["รูปภาพ", getIssueValue(issue, "IMAGE")]
    ];

    fields.forEach(function (field) {
        const wrapper = document.createElement("div");
        wrapper.className = "detail-row";

        const label = document.createElement("strong");
        label.textContent = field[0] + ": ";

        const value = document.createElement("span");
        value.textContent = field[1] || "-";

        wrapper.appendChild(label);
        wrapper.appendChild(value);

        detail.appendChild(wrapper);
    });

    modal.hidden = false;
}


/*************************************************
 * ปิด Modal
 *************************************************/

function closeModal() {
    const modal =
        document.getElementById("issueModal");

    if (modal) {
        modal.hidden = true;
    }
}


/*************************************************
 * จัดรูปแบบวันที่
 *************************************************/

function formatDate(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("th-TH", {
        dateStyle: "short",
        timeStyle: "short"
    });
}
