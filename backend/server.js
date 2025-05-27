import express from "express"
import nodemailer from "nodemailer"
import { GoogleGenerativeAI } from "@google/generative-ai"
import dotenv from "dotenv"
import cors from "cors"
import fs from "fs"
import path from "path"

import PDFParser from "pdf2json"

// Importations spécifiques pour __dirname dans les modules ES
import { fileURLToPath } from "url"
import { dirname } from "path"

// Obtenir l'équivalent de __filename et __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

// Middlewares
app.use(cors())
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
  },
})

// Gemini configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_APIKEY)

// Chemin vers le PDF
const pdfPath = path.join(__dirname, "assets", "Recettes-de-cuisine-Camerounaise.pdf")

// Fonction pour obtenir les emojis selon l'âge
function getAgeAppropriateEmojis(age) {
  if (age < 12) {
    return {
      greeting: "🌟",
      food: "🍽️",
      days: ["🌅", "🌞", "🌤️", "⭐", "🌙", "🎉", "🌈"],
      closing: "🎈",
    }
  } else if (age >= 12 && age < 18) {
    return {
      greeting: "👋",
      food: "🍴",
      days: ["💪", "🔥", "⚡", "🎯", "🚀", "🎊", "✨"],
      closing: "💯",
    }
  } else {
    return {
      greeting: "📧",
      food: "🍽️",
      days: ["📅", "📅", "📅", "📅", "📅", "📅", "📅"],
      closing: "📋",
    }
  }
}

// Fonction pour obtenir le style CSS selon l'âge
function getAgeAppropriateStyles(age) {
  if (age < 12) {
    return {
      primaryColor: "#FF6B6B",
      secondaryColor: "#4ECDC4",
      accentColor: "#45B7D1",
      fontFamily: "Comic Sans MS, cursive, sans-serif",
      headerGradient: "linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)",
      buttonColor: "#FF6B6B",
    }
  } else if (age >= 12 && age < 18) {
    return {
      primaryColor: "#6C5CE7",
      secondaryColor: "#A29BFE",
      accentColor: "#FD79A8",
      fontFamily: "Arial, Helvetica, sans-serif",
      headerGradient: "linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)",
      buttonColor: "#6C5CE7",
    }
  } else {
    return {
      primaryColor: "#2D3436",
      secondaryColor: "#636E72",
      accentColor: "#0984E3",
      fontFamily: "Georgia, serif",
      headerGradient: "linear-gradient(135deg, #2D3436 0%, #636E72 100%)",
      buttonColor: "#0984E3",
    }
  }
}

// Generate enhanced email content
async function generateEmailContent(member, mealPlan) {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

  const mealPlanList = days
    .map((day) => {
      const dishName = mealPlan[day] || "Aucun plat"
      return `${day.charAt(0).toUpperCase() + day.slice(1)} : ${dishName}`
    })
    .join("\n")

  const emojis = getAgeAppropriateEmojis(member.age)
  const styles = getAgeAppropriateStyles(member.age)

  // Prompt amélioré et plus détaillé
  const prompt = `
    Créez un message d'email personnalisé et chaleureux pour un plan de repas hebdomadaire destiné à ${member.fullName}, âgé(e) de ${member.age} ans.

    INSTRUCTIONS SPÉCIFIQUES SELON L'ÂGE :
    
    ${
      member.age < 12
        ? `
    ENFANT (${member.age} ans) - Ton ludique et amusant :
    - Utilisez un langage simple et joyeux
    - Intégrez des expressions comme "Coucou", "Super", "Génial", "Youpi"
    - Mentionnez que manger varié aide à grandir fort et intelligent
    - Encouragez la découverte de nouveaux goûts
    - Terminez par une note encourageante sur l'aventure culinaire
    `
        : member.age >= 12 && member.age < 18
          ? `
    ADOLESCENT (${member.age} ans) - Ton décontracté et motivant :
    - Utilisez un langage moderne et énergique
    - Intégrez des expressions comme "Salut", "Cool", "Top", "Parfait"
    - Mentionnez l'importance de bien manger pour les études et le sport
    - Encouragez l'autonomie et la participation en cuisine
    - Terminez par une note motivante sur les bonnes habitudes alimentaires
    `
          : `
    ADULTE (${member.age} ans) - Ton professionnel et informatif :
    - Utilisez un langage respectueux et informatif
    - Intégrez des expressions comme "Bonjour", "Nous espérons", "Cordialement"
    - Mentionnez l'importance de l'équilibre nutritionnel et de la planification
    - Soulignez les bénéfices de la planification familiale des repas
    - Terminez par une note professionnelle sur l'organisation familiale
    `
    }

    STRUCTURE REQUISE :
    1. Salutation personnalisée avec le prénom
    2. Introduction chaleureuse au concept du plan de repas
    3. Phrase d'encouragement adaptée à l'âge
    4. Transition vers le tableau des repas
    5. Message de clôture approprié

    CONTRAINTES :
    - Le message doit faire entre 3 et 5 phrases
    - Adaptez le vocabulaire à l'âge (simple pour enfants, moderne pour ados, professionnel pour adultes)
    - Ne listez PAS les plats dans le texte, ils seront dans le tableau
    - Retournez UNIQUEMENT le contenu du message sans balises HTML
    - Le ton doit être authentique et naturel

    Exemple de plats disponibles : ${mealPlanList.replace("\n", ", ")}
  `

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const result = await model.generateContent(prompt)
    const personalizedMessage = result.response.text()

    // Construction du tableau HTML amélioré pour le plan de repas
    const mealPlanTable = `
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 20px 0;">
        <div style="background: ${styles.headerGradient}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 24px; font-weight: bold;">
            ${emojis.food} Plan de Repas de la Semaine ${emojis.food}
          </h2>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-family: ${styles.fontFamily};">
          <thead>
            <tr style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);">
              <th style="padding: 15px; text-align: left; font-weight: bold; color: ${styles.primaryColor}; border-bottom: 2px solid ${styles.accentColor};">
                📅 Jour
              </th>
              <th style="padding: 15px; text-align: left; font-weight: bold; color: ${styles.primaryColor}; border-bottom: 2px solid ${styles.accentColor};">
                🍽️ Plat du Jour
              </th>
            </tr>
          </thead>
          <tbody>
            ${days
              .map((day, index) => {
                const isWeekend = day === "saturday" || day === "sunday"
                const dayEmoji = emojis.days[index]
                const dishName = mealPlan[day] || "Aucun plat prévu"

                return `
                <tr style="background: ${isWeekend ? "linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)" : "#ffffff"}; transition: all 0.3s ease;">
                  <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: ${styles.primaryColor};">
                    ${dayEmoji} ${dayNames[index]}
                    ${isWeekend ? " 🎉" : ""}
                  </td>
                  <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; color: ${styles.secondaryColor};">
                    <strong style="color: ${styles.primaryColor};">${dishName}</strong>
                    ${dishName !== "Aucun plat prévu" ? " ✨" : " 🤔"}
                  </td>
                </tr>
              `
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `

    // Template d'email complet avec design moderne
    const emailTemplate = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Plan de Repas Hebdomadaire</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          
          .header {
            background: ${styles.headerGradient};
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
            position: relative;
            z-index: 1;
          }
          
          .content {
            padding: 40px 30px;
            font-family: ${styles.fontFamily};
          }
          
          .greeting {
            font-size: 18px;
            color: ${styles.primaryColor};
            margin-bottom: 20px;
            line-height: 1.8;
          }
          
          .cta-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            text-align: center;
            border-left: 5px solid ${styles.accentColor};
          }
          
          .cta-button {
            display: inline-block;
            background: ${styles.buttonColor};
            color: white;
            padding: 12px 30px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 15px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          }
          
          .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
          }
          
          .footer p {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
          }
          
          .social-links {
            margin-top: 20px;
          }
          
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: ${styles.accentColor};
            text-decoration: none;
            font-size: 24px;
          }
          
          @media (max-width: 600px) {
            .email-container {
              margin: 10px;
              border-radius: 15px;
            }
            
            .header, .content, .footer {
              padding: 20px;
            }
            
            .header h1 {
              font-size: 24px;
            }
            
            table th, table td {
              padding: 10px !important;
              font-size: 14px !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>${emojis.greeting} Planification Familiale ${emojis.greeting}</h1>
            <p>Votre plan de repas personnalisé est arrivé !</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              ${personalizedMessage}
            </div>
            
            ${mealPlanTable}
            
            <div class="cta-section">
              <h3 style="color: ${styles.primaryColor}; margin-bottom: 10px;">
                ${
                  member.age < 12
                    ? "🌟 Astuce du Chef Junior !"
                    : member.age < 18
                      ? "💡 Conseil Nutrition"
                      : "📊 Conseils Nutritionnels"
                }
              </h3>
              <p style="color: ${styles.secondaryColor}; margin-bottom: 15px;">
                ${
                  member.age < 12
                    ? "N'oublie pas de goûter chaque plat avec curiosité ! Chaque bouchée est une nouvelle aventure."
                    : member.age < 18
                      ? "Une alimentation équilibrée t'aide à rester en forme pour tes activités et tes études !"
                      : "Une planification des repas permet d'économiser du temps et de garantir une alimentation équilibrée pour toute la famille."
                }
              </p>
              <a href="#" class="cta-button">
                ${
                  member.age < 12
                    ? "🎮 Découvrir plus de recettes"
                    : member.age < 18
                      ? "🚀 Voir d'autres idées"
                      : "📋 Accéder à plus de plans"
                }
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>L'Équipe de Planification Familiale</strong></p>
            <p>Nous rendons la planification des repas simple et amusante ! ${emojis.closing}</p>
            <p style="font-size: 12px; color: #999; margin-top: 20px;">
              Cet email a été généré automatiquement. Si vous avez des questions, n'hésitez pas à nous contacter.
            </p>
            <div class="social-links">
              <a href="#">📧</a>
              <a href="#">🌐</a>
              <a href="#">📱</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    return emailTemplate
  } catch (error) {
    console.error(`Erreur Gemini pour ${member.email}:`, error.stack)
    throw new Error(`Erreur Gemini: ${error.message}`)
  }
}

// Send meal plan emails
app.post("/send-meal-plan-emails", async (req, res) => {
  console.log("Requête reçue:", req.body)
  if (!req.body) {
    console.error("Corps de la requête manquant")
    return res.status(400).json({ error: "Corps de la requête manquant." })
  }

  const { userId, members, mealPlan } = req.body

  if (!userId || !members || !mealPlan) {
    console.error("Données manquantes:", { userId, members, mealPlan })
    return res.status(400).json({ error: "Données manquantes." })
  }

  try {
    for (const member of members) {
      if (!member.email || !member.fullName || !member.age) {
        console.warn(`Membre ${member.id} ignoré : email, nom ou âge manquant.`)
        continue
      }

      console.log(`Génération de contenu pour ${member.email}`)
      const emailContent = await generateEmailContent(member, mealPlan)
      console.log(`Contenu généré pour ${member.email}`)

      // Sujet personnalisé selon l'âge
      let subject = "Votre Plan de Repas Hebdomadaire"
      if (member.age < 12) {
        subject = `🌟 ${member.fullName}, ton menu magique de la semaine !`
      } else if (member.age < 18) {
        subject = `🔥 ${member.fullName}, ton planning repas est prêt !`
      } else {
        subject = `📋 Plan de repas hebdomadaire - ${member.fullName}`
      }

      const mailOptions = {
        from: `"Planification Familiale" <${process.env.GMAIL_EMAIL}>`,
        to: member.email,
        subject: subject,
        html: emailContent,
      }

      console.log(`Envoi d'email à ${member.email}`)
      await transporter.sendMail(mailOptions)
      console.log(`Email envoyé à ${member.email}`)
    }

    return res.status(200).json({ message: "Emails envoyés avec succès." })
  } catch (error) {
    console.error("Erreur détaillée:", error.stack)
    return res.status(500).json({ error: error.message || "Erreur interne." })
  }
})

// Propose 7 random recipes
app.get("/propose-recipes", async (req, res) => {
  try {
    // Vérifier si le PDF existe
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: "Fichier PDF introuvable à: " + pdfPath })
    }

    const pdfBuffer = fs.readFileSync(pdfPath)
    const pdfParser = new PDFParser()
    let pdfText = ""

    await new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        pdfData.Pages.forEach((page) => {
          page.Texts.forEach((textItem) => {
            textItem.R.forEach((textRun) => {
              pdfText += decodeURIComponent(textRun.T)
            })
          })
          pdfText += "\n"
        })
        resolve()
      })

      pdfParser.on("pdfParser_dataError", (errData) => {
        console.error("Erreur PDFParser:", errData.parserError)
        reject(new Error("Erreur lors de l'analyse du PDF avec pdf2json: " + errData.parserError))
      })

      pdfParser.parseBuffer(pdfBuffer)
    })

    if (
      !pdfText.includes("Ingrédients") &&
      !pdfText.includes("Préparation") &&
      !pdfText.includes("ingredients") &&
      !pdfText.includes("preparation")
    ) {
      return res
        .status(400)
        .json({ error: "Le PDF ne semble pas contenir de recettes valides ou le texte n'a pas pu être extrait." })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const prompt = `
      Voici le contenu d'un document de recettes camerounaises :
      ${pdfText.substring(0, 30000)} 

      Identifiez toutes les recettes dans ce texte. Chaque recette doit inclure :
      - Un nom (titre de la recette).
      - Une liste d'ingrédients (séparés par des virgules, retours à la ligne ou puces).
      - Des instructions de préparation (étapes détaillées).

      Sélectionnez "aléatoirement" 7 recettes et retournez-les au format JSON suivant, entouré de \`\`\`json\n et \n\`\`\` :
      \`\`\`json
      [
        {
          "name": "Nom de la recette",
          "ingredients": ["ingrédient 1", "ingrédient 2", ...],
          "instructions": "Instructions détaillées"
        },
        ...
      ]
      \`\`\`

      Ne modifiez pas le contenu du document. Extrayez uniquement les 7 recettes aléatoirement telles qu'elles apparaissent. Si moins de 7 recettes sont disponibles, retournez toutes les recettes trouvées. Assurez-vous que le JSON est valide.
    `

    const result = await model.generateContent(prompt)
    const recipesText = result.response.text()

    const jsonMatch = recipesText.match(/```json\n([\s\S]*?)\n```/)
    if (!jsonMatch || !jsonMatch[1]) {
      throw new Error("Réponse de Gemini mal formatée : JSON introuvable.")
    }

    let recipes
    try {
      recipes = JSON.parse(jsonMatch[1])
    } catch (e) {
      throw new Error("Erreur de parsing JSON : " + e.message)
    }

    if (!Array.isArray(recipes)) {
      throw new Error("Gemini n'a pas retourné un tableau de recettes.")
    }

    if (recipes.length < 7) {
      console.warn(`Seulement ${recipes.length} recettes extraites au lieu de 7.`)
    }

    res.json({ recipes })
  } catch (error) {
    console.error("Erreur lors de la proposition de recettes:", error.stack)
    res.status(500).json({ error: error.message || "Erreur interne." })
  }
})

// Serve the recipe PDF
app.get("/get-recipe-pdf", (req, res) => {
  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ error: "Fichier PDF introuvable." })
  }
  res.sendFile(pdfPath)
})

// Test routes
app.get("/", (req, res) => {
  res.send("Backend for todo-app is running!")
})

app.get("/test-env", (req, res) => {
  res.json({
    gmailEmail: !!process.env.GMAIL_EMAIL,
    gmailPassword: !!process.env.GMAIL_PASSWORD,
    geminiApiKey: !!process.env.GEMINI_APIKEY,
  })
})

app.get("/test-email", async (req, res) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_EMAIL,
      to: process.env.GMAIL_EMAIL,
      subject: "Test Email",
      text: "Ceci est un test depuis Nodemailer.",
    }
    await transporter.sendMail(mailOptions)
    console.log("Email de test envoyé")
    res.json({ message: "Email de test envoyé" })
  } catch (error) {
    console.error("Erreur test email:", error.stack)
    return res.status(500).json({ error: error.message })
  }
})

app.get("/test-gemini", async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const result = await model.generateContent("Bonjour, ceci est un test.")
    console.log("Réponse Gemini:", result.response.text())
    res.json({ message: "Test Gemini réussi", response: result.response.text() })
  } catch (error) {
    console.error("Erreur test Gemini:", error.stack)
    return res.status(500).json({ error: error.message })
  }
})

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
