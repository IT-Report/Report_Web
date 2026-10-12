/*************************************************
 * AUTHENTICATION SYSTEM
 *************************************************/


/**
 * ดึงข้อมูลผู้ใช้ปัจจุบัน
 */
function getCurrentUser() {
    const isLoggedIn =
        sessionStorage.getItem("isLoggedIn");

    const username =
        sessionStorage.getItem("username");

    const department =
        sessionStorage.getItem("department");

    const role =
        sessionStorage.getItem("role");

    if (
        isLoggedIn !== "true" ||
        !username ||
        !department ||
        !role
    ) {
        return null;
    }

    return {
        isLoggedIn: true,
        username: username,
        department: department,
        role: role
    };
}


/**
 * ตรวจสอบการ Login สำหรับหน้า Employee
 * ใช้กับ pages/report.html
 */
function checkLogin() {
    const user = getCurrentUser();

    if (!user) {
        window.location.href = "../index.html";
        return false;
    }

    /*
     * Admin ไม่ควรเข้าหน้า Employee
     */
    if (user.role === "admin") {
        window.location.href = "dashboard.html";
        return false;
    }

    /*
     * อนุญาตเฉพาะ Employee
     */
    if (user.role !== "employee") {
        window.location.href = "../index.html";
        return false;
    }

    return true;
}


/**
 * ตรวจสอบสิทธิ์ Admin
 * ใช้กับ pages/dashboard.html
 */
function checkAdmin() {
    const user = getCurrentUser();

    if (!user) {
        window.location.href = "../index.html";
        return false;
    }

    if (user.role !== "admin") {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้า Admin Dashboard");
        window.location.href = "report.html";
        return false;
    }

    return true;
}


/**
 * ตรวจสอบว่าเป็น Admin หรือไม่
 */
function isAdmin() {
    const user = getCurrentUser();

    return !!user && user.role === "admin";
}


/**
 * ตรวจสอบว่าเป็น Employee หรือไม่
 */
function isEmployee() {
    const user = getCurrentUser();

    return !!user && user.role === "employee";
}


/**
 * ออกจากระบบ
 */
function logout() {
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("department");
    sessionStorage.removeItem("role");

    /*
     * กลับไปหน้า Login
     * เพราะ auth.js ถูกเรียกจากหน้าในโฟลเดอร์ pages
     */
    window.location.href = "../index.html";
}