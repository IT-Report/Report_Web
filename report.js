/*************************************************
 * ISSUE REPORT SYSTEM
 * report.js - COMPLETE FIX
 *************************************************/

const API_URL =
    "https://script.google.com/macros/s/AKfycbw4tzbbumpOpqtPD9e1TUBgRi9EX6-c4nWPIBIyK2vlJdLsdfLRrMC7N0rUiK5fnFpf/exec";


/*************************************************
 * เมื่อหน้าเว็บโหลด
 *************************************************/

document.addEventListener("DOMContentLoaded", function () {

    const reportForm =
        document.getElementById("reportForm");

    const logoutButton =
        document.getElementById("logoutButton");

    const resetButton =
        document.getElementById("resetButton");


    /*
     * ตรวจสอบ Login
     */

    if (typeof checkLogin === "function") {
        checkLogin();
    }


    /*
     * ตรวจสอบ Form
     */

    if (!reportForm) {

        console.error(
            "ไม่พบ form id='reportForm'"
        );

        return;
    }


    /*
     * Logout
     */

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {

                if (typeof logout === "function") {

                    logout();

                } else {

                    sessionStorage.clear();

                    window.location.href =
                        "index.html";
                }

            }
        );

    }


    /*
     * Reset
     */

    if (resetButton) {

        resetButton.addEventListener(
            "click",
            function () {

                setTimeout(function () {

                    hideMessages();

                }, 0);

            }
        );

    }


    /*
     * Submit
     */

    reportForm.addEventListener(
        "submit",
        handleReportSubmit
    );

});


/*************************************************
 * ส่งข้อมูล
 *************************************************/

async function handleReportSubmit(event) {

    event.preventDefault();
    event.stopPropagation();


    const reportForm =
        document.getElementById("reportForm");

    const submitButton =
        document.getElementById("submitButton");


    if (!reportForm) {

        showError(
            "ไม่พบแบบฟอร์มแจ้งปัญหา"
        );

        return;
    }


    /*
     * ตรวจสอบ User
     */

    let currentUser = null;


    if (
        typeof getCurrentUser === "function"
    ) {

        currentUser =
            getCurrentUser();

    }


    if (!currentUser) {

        showError(
            "ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่"
        );

        return;
    }


    /*************************************************
     * อ่านข้อมูลจาก Form
     *************************************************/

    

    /*
     * สำคัญ
     * HTML ใช้ id="issueType"
     * ไม่ใช่ category
     */

    const issueType =
        getValue("category");


    const description =
        getValue("description");


    const reporterName =
        getValue("reporterName");


    const imageInput =
        document.getElementById("image");


    /*************************************************
     * ตรวจสอบข้อมูล
     *************************************************/



    if (!issueType) {

        showError(
            "กรุณาเลือกประเภทปัญหา"
        );

        focusElement("category");

        return;
    }


    if (!description) {

        showError(
            "กรุณากรอกรายละเอียดปัญหา"
        );

        focusElement("description");

        return;
    }




    /*************************************************
     * อ่านรูปภาพ
     *************************************************/

    let imageBase64 = "";


    if (
        imageInput &&
        imageInput.files &&
        imageInput.files.length > 0
    ) {

        const imageFile =
            imageInput.files[0];


        /*
         * จำกัด 5 MB
         */

        const maxFileSize =
            5 * 1024 * 1024;


        if (imageFile.size > maxFileSize) {

            showError(
                "รูปภาพต้องมีขนาดไม่เกิน 5 MB"
            );

            return;
        }


        /*
         * ตรวจสอบไฟล์
         */

        if (
            !imageFile.type ||
            !imageFile.type.startsWith("image/")
        ) {

            showError(
                "กรุณาเลือกไฟล์รูปภาพเท่านั้น"
            );

            return;
        }


        try {

            imageBase64 =
                await convertFileToBase64(
                    imageFile
                );

        } catch (error) {

            console.error(
                "อ่านรูปภาพไม่สำเร็จ:",
                error
            );

            showError(
                "ไม่สามารถอ่านรูปภาพได้"
            );

            return;
        }

    }


    /*************************************************
     * สร้าง Ticket
     *************************************************/

    const ticket =
        createTicketNumber();


    /*************************************************
     * เวลาปัจจุบันของเครื่องผู้ใช้
     *
     * ใช้เวลาท้องถิ่นไทย
     *************************************************/

    const now =
        new Date();


    const dateTime =
        formatThaiDateTime(now);


    /*************************************************
     * สร้างข้อมูล
     *************************************************/

    const payload = {
    action: "createIssue",

    ticket: ticket,
    dateTime: dateTime,

    user: currentUser.username || currentUser.user || "",
    department: currentUser.department || "",

    category: issueType,
    description: description,
    reporterName: reporterName,

    status: "รอดำเนินการ",

    image: imageBase64
};


    // ไม่ log payload เพราะอาจมีข้อมูลรูปภาพ Base64 ขนาดใหญ่


    /*************************************************
     * ป้องกันกดซ้ำ
     *************************************************/

    if (submitButton) {

        submitButton.disabled = true;

        submitButton.dataset.originalText =
            submitButton.innerHTML;

        submitButton.innerHTML =
            "กำลังส่งข้อมูล...";

    }


    hideMessages();


    /*************************************************
     * ส่งข้อมูล
     *************************************************/

    try {

        const result =
            await postToGoogleAppsScript(
                payload
            );


        console.log(
            "ผลลัพธ์:",
            result
        );


        if (
            result &&
            result.success === true
        ) {

            showSuccess(
                "ส่งแจ้งปัญหาสำเร็จ เลขที่ Ticket: " +
                ticket
            );


            /*
             * ล้าง Form
             */

            reportForm.reset();


        } else {

            showError(
                result &&
                result.message
                    ? result.message
                    : "ไม่สามารถส่งข้อมูลได้"
            );

        }


    } catch (error) {

        console.error(
            "ส่งข้อมูลไม่สำเร็จ:",
            error
        );


        showError(
            error.message ||
            "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
        );


    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.innerHTML =
                submitButton.dataset.originalText ||
                "ส่งแจ้งปัญหา";

        }

    }

}


/*************************************************
 * ส่งข้อมูลไป Google Apps Script
 *
 * ใช้ Hidden Iframe
 * เพื่อหลีกเลี่ยง CORS
 *************************************************/

function postToGoogleAppsScript(payload) {
    return new Promise(function (resolve, reject) {
        const iframeName = "issueReportFrame_" + Date.now();
        const iframe = document.createElement("iframe");
        iframe.name = iframeName;
        iframe.id = iframeName;
        iframe.style.display = "none";

        const form = document.createElement("form");
        form.method = "POST";
        form.action = API_URL;
        form.target = iframeName;
        form.style.display = "none";

        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "payload";
        input.value = JSON.stringify(payload);
        form.appendChild(input);

        let completed = false;
        const timeoutId = setTimeout(function () {
            if (completed) return;
            completed = true;
            cleanup();
            reject(new Error("หมดเวลารอ Google Apps Script กรุณาตรวจสอบการ Deploy และลองอีกครั้ง"));
        }, 60000);

        function cleanup() {
            clearTimeout(timeoutId);
            window.removeEventListener("message", handleMessage);
            setTimeout(function () {
                if (form.parentNode) form.parentNode.removeChild(form);
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            }, 300);
        }

        function handleMessage(event) {
            const message = event.data;
            if (!message || message.type !== "REPORT_IT_RESULT") return;
            if (completed) return;

            completed = true;
            cleanup();

            if (message.result && message.result.success === true) {
                resolve(message.result);
            } else {
                reject(new Error(
                    message.result && message.result.message
                        ? message.result.message
                        : "Google Apps Script ไม่สามารถบันทึกข้อมูลได้"
                ));
            }
        }

        window.addEventListener("message", handleMessage);
        document.body.appendChild(iframe);
        document.body.appendChild(form);

        try {
            form.submit();
        } catch (error) {
            if (!completed) {
                completed = true;
                cleanup();
                reject(new Error("ไม่สามารถส่งข้อมูลไปยัง Google Apps Script ได้"));
            }
        }
    });
}

/*************************************************
 * แปลงรูปเป็น Base64
 *************************************************/

function convertFileToBase64(file) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function () {

                    resolve(
                        reader.result
                    );

                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "อ่านไฟล์ไม่สำเร็จ"
                        )
                    );

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


/*************************************************
 * สร้าง Ticket
 *************************************************/

function createTicketNumber() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    const hours =
        String(
            now.getHours()
        ).padStart(
            2,
            "0"
        );


    const minutes =
        String(
            now.getMinutes()
        ).padStart(
            2,
            "0"
        );


    const seconds =
        String(
            now.getSeconds()
        ).padStart(
            2,
            "0"
        );


    const random =
        Math.floor(
            Math.random() * 900
        ) + 100;


    return (
        "IT-" +
        year +
        month +
        day +
        "-" +
        hours +
        minutes +
        seconds +
        "-" +
        random
    );

}


/*************************************************
 * เวลาไทย
 *************************************************/

function formatThaiDateTime(date) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    const hours =
        String(
            date.getHours()
        ).padStart(
            2,
            "0"
        );


    const minutes =
        String(
            date.getMinutes()
        ).padStart(
            2,
            "0"
        );


    const seconds =
        String(
            date.getSeconds()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day +
        " " +
        hours +
        ":" +
        minutes +
        ":" +
        seconds
    );

}


/*************************************************
 * อ่านค่า Input
 *************************************************/

function getValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {

        console.warn(
            "ไม่พบ element:",
            id
        );

        return "";
    }


    return (
        element.value ||
        ""
    ).trim();

}


/*************************************************
 * Focus
 *************************************************/

function focusElement(id) {

    const element =
        document.getElementById(id);


    if (element) {

        element.focus();

    }

}


/*************************************************
 * แสดง Error
 *************************************************/

function showError(message) {

    const errorMessage =
        document.getElementById(
            "errorMessage"
        );


    const successMessage =
        document.getElementById(
            "successMessage"
        );


    if (successMessage) {

        successMessage.style.display =
            "none";

        successMessage.hidden =
            true;

    }


    if (errorMessage) {

        errorMessage.textContent =
            message;

        errorMessage.style.display =
            "block";

        errorMessage.hidden =
            false;


        errorMessage.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }


    console.error(
        message
    );

}


/*************************************************
 * แสดง Success
 *************************************************/

function showSuccess(message) {

    const successMessage =
        document.getElementById(
            "successMessage"
        );


    const errorMessage =
        document.getElementById(
            "errorMessage"
        );


    if (errorMessage) {

        errorMessage.style.display =
            "none";

        errorMessage.hidden =
            true;

    }


    if (successMessage) {

        successMessage.textContent =
            message;

        successMessage.style.display =
            "block";

        successMessage.hidden =
            false;


        successMessage.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }

}


/*************************************************
 * ซ่อนข้อความ
 *************************************************/

function hideMessages() {

    const errorMessage =
        document.getElementById(
            "errorMessage"
        );


    const successMessage =
        document.getElementById(
            "successMessage"
        );


    if (errorMessage) {

        errorMessage.style.display =
            "none";

        errorMessage.hidden =
            true;

        errorMessage.textContent =
            "";

    }


    if (successMessage) {

        successMessage.style.display =
            "none";

        successMessage.hidden =
            true;

        successMessage.textContent =
            "";

    }

}
