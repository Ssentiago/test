const BASE_URL = 'http://94.103.91.4:5000';
const REGISTRATION_URL = `${BASE_URL}/auth/registration`;
const LOGIN_URL = `${BASE_URL}/auth/login`;
const CLIENTS_URL = `${BASE_URL}/clients`;

async function createOrLogin(username) {
    try {
        const registrationResponse = UrlFetchApp.fetch(REGISTRATION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            payload: JSON.stringify({ username }),
        });
    } catch (err) {
        // пользователь существует, ничего не делаем, идём дальше
    }

    try {
        const loginResponse = UrlFetchApp.fetch(LOGIN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            payload: JSON.stringify({ username }),
        });
        const loginData = JSON.parse(loginResponse.getContentText());

        return loginData.token;
    } catch (err) {
        Logger.log(`Ошибка авторизации: ${err.message}`);
        return null;
    }
}

function getRows(token) {
    return function (limit, offset) {
        const clientsResponse = UrlFetchApp.fetch(
            `${CLIENTS_URL}?limit=${limit}&offset=${offset}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `${token}`,
                },
            }
        );

        const clientsData = JSON.parse(clientsResponse.getContentText());

        const statusResponse = UrlFetchApp.fetch(`${CLIENTS_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `${token}`,
            },
            payload: JSON.stringify({
                userIds: clientsData.map((user) => user.id),
            }),
        });

        const statusData = JSON.parse(statusResponse.getContentText());

        const statusMap = new Map(
            statusData.map(({ id, status }) => [id, status])
        );

        const rows = clientsData.map((user) => [
            user.id,
            user.firstName,
            user.lastName,
            user.gender,
            user.address,
            user.city,
            user.phone,
            user.email,
            statusMap.get(user.id) ?? '-',
        ]);

        return rows;
    };
}

async function main(USERNAME, SHEET_ID) {
    const token = await createOrLogin(USERNAME);

    if (token === null) {
        return 'No valid user provided';
    }

    const rowsGetter = getRows(token);

    const allRows = [];

    let offset = 0;
    const limit = 1000;

    while (true) {
        const rows = rowsGetter(limit, offset);
        allRows.push(...rows);

        Logger.log(`Загружено ${allRows.length} записей...`);

        if (rows.length < limit) {
            break;
        }

        offset += 1000;
    }

    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getSheetByName('Лист1');
    sheet.clear();
    sheet.appendRow([
        'id',
        'firstName',
        'lastName',
        'gender',
        'address',
        'city',
        'phone',
        'email',
        'status',
    ]);

    sheet.getRange(2, 1, allRows.length, allRows[0].length).setValues(allRows);

    Logger.log('DONE');

    return `Записано строк: ${allRows.length}`;
}

main(
    'й12q1q1q1q11q2q11йц1qww12wй231q2222wq112dswewq1WQqw',
    '1Ec8_Eyk3bP9t2Xx9ZcWtw-pOL4aMhoFavWwz0_JrmxY'
);
