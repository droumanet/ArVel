/*--------------------------------------------------------------------------
  Initialisation for database connexion.
  Change here for connexion settings.
  2024-04-14    Add .env file for connectDB()
  2025-08-13    Rewrite to manage errors
  --------------------------------------------------------------------------
*/
import * as dotenv from 'dotenv';
import mysql from 'mysql2'

let dbPool
dotenv.config();

async function connectDB() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        }).promise();
        // FIXME await pool.execute('SELECT 1');
        console.log("Arvel - ✅ Connected to remote database");
        return pool
    } catch (error) {
        console.error("Arvel - ❌ Database connexion error", error.message)
        throw new Error(`Arvel - ❌ Unable to connect database: ${process.env.DB_HOST} as ${process.env.DB_USER}, ${error.message}`)
    }
}

/**
 * @param values {Array} of TeleInfo for production and cunsomption
 */
async function SQLsetPowerDay(values) {
    if (!dbPool) throw new Error(`Arvel - ❌ Unable to connect database: ${process.env.DB_HOST} as ${process.env.DB_USER}, ${error.message}`)

    const sql = `INSERT INTO pwrDay 
        (jour, indexconsohp, indexconsohc, indexprod, pwrconsomax, pwrprodmax, indexprodconso) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await dbPool.execute(sql, values)
    console.log("  DBModel setPowerDay success")
    return result.affectedRows;
}

/**
 * @param values {Array} of TeleInfo for production and cunsomption
 */
 async function SQLsetEnergy(values) {
    if (!dbPool) throw new Error(`Arvel - ❌ Unable to connect database: ${process.env.DB_HOST} as ${process.env.DB_USER}, ${error.message}`)
    
    /*
    let sql='REPLACE INTO Energie (ModAddr, ModPart, dateRecord, PowerIndex, PowerInst) VALUES (?)';
    db.query(sql, [values], function (err, data) {
        if (err) throw err;
        console.log("setEnergy success");
        return data.affectedRows;
    })
    */
    const sql = `REPLACE INTO Energie (ModAddr, ModPart, dateRecord, PowerIndex, PowerInst) 
    VALUES (?, ?, ?, ?, ?)`
    const [result] = await dbPool.execute(sql, values)
    return result.affectedRows
}

// launch initial connexion
dbPool = await connectDB()

export {SQLsetPowerDay, SQLsetEnergy}