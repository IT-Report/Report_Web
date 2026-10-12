/*************************************************
 * LOGIN SYSTEM
 *************************************************/

const departmentAccounts = {
    GAD: {
        password: "KftcGad",
        department: "GAD",
        role: "employee"
    },

    QCD: {
        password: "KftcQcd",
        department: "QCD",
        role: "employee"
    },

    ACD: {
        password: "KftcAcd",
        department: "ACD",
        role: "employee"
    },

    MKD: {
        password: "KftcMkd",
        department: "MKD",
        role: "employee"
    },

    PSD: {
        password: "KftcPsd",
        department: "PSD",
        role: "employee"
    },

    PED: {
        password: "KftcPed",
        department: "PED",
        role: "employee"
    },

    PDD: {
        password: "KftcPdd",
        department: "PDD",
        role: "employee"
    },

    PCS: {
        password: "KftcPcs",
        department: "PCS",
        role: "employee"
    },

    PCD: {
        password: "KftcPcd",
        department: "PCD",
        role: "employee"
    },
    
    
    PRD: {
        password: "KftcPrd",
        department: "PRD",
        role: "employee"
    },

    ADMIN: {
        password: "Admin12345678",
        department: "IT",
        role: "admin"
    }
};


/*************************************************
 * LOGIN FORM
 *************************************************/

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");

        const username = usernameInput.value
            .trim()
            .toUpperCase();

        const password = passwordInput.value;

        if (username === "") {
            alert("กรุณากรอก Username");
            usernameInput.focus();
            return;
        }

        if (password === "") {
            alert("กรุณากรอก Password");
            passwordInput.focus();
            return;
        }

        const account = departmentAccounts[username];

        if (!account) {
            alert("Username หรือ Password ไม่ถูกต้อง");
            return;
        }

        if (password !== account.password) {
            alert("Username หรือ Password ไม่ถูกต้อง");
            return;
        }

        /*
         * ล้าง Session เก่าก่อน Login ใหม่
         */
        sessionStorage.clear();

        /*
         * บันทึก Session ให้ตรงกับ auth.js
         */
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("username", username);
        sessionStorage.setItem("department", account.department);
        sessionStorage.setItem("role", account.role);

        /*
         * เปลี่ยนหน้าแยกตามสิทธิ์
         */
        if (account.role === "admin") {
            window.location.href = "dashboard.html";
        } else {
            window.location.href = "report.html";
        }
    });
});