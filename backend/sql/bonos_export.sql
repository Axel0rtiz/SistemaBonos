SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

USE `Bonos`;

DROP TABLE IF EXISTS `Zonas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Zonas` (
  `id_zona` int NOT NULL AUTO_INCREMENT,
  `nombre_zona` varchar(50) NOT NULL,
  PRIMARY KEY (`id_zona`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `Zonas` VALUES (1,'Superior'),(2,'Inferior');




DROP TABLE IF EXISTS `Filas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Filas` (
  `id_fila` int NOT NULL AUTO_INCREMENT,
  `id_zona` int NOT NULL,
  `nombre_fila` varchar(50) NOT NULL,
  `tipo` enum('fijo','temporal') NOT NULL DEFAULT 'fijo',
  PRIMARY KEY (`id_fila`),
  KEY `id_zona` (`id_zona`),
  CONSTRAINT `filas_ibfk_1` FOREIGN KEY (`id_zona`) REFERENCES `Zonas` (`id_zona`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `Filas` VALUES (1,1,'T2-32/ Fila L','fijo'),(2,2,'T1-33/ Fila H','fijo'),(3,2,'T1-27/ Fila P','fijo'),(4,2,'T1-14/ Fila K','fijo'),(5,2,'T1-11/ Fila K','fijo'),(6,2,'T1-11/ Fila J','fijo'),(7,2,'T1-09/ Fila M','fijo');




DROP TABLE IF EXISTS `Asientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Asientos` (
  `id_asiento` int NOT NULL AUTO_INCREMENT,
  `id_fila` int NOT NULL,
  `numero_asiento` int NOT NULL,
  `tipo` enum('fijo','temporal') NOT NULL DEFAULT 'fijo',
  PRIMARY KEY (`id_asiento`),
  KEY `id_fila` (`id_fila`),
  CONSTRAINT `asientos_ibfk_1` FOREIGN KEY (`id_fila`) REFERENCES `Filas` (`id_fila`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `Asientos` VALUES (1,1,5,'fijo'),(2,1,6,'fijo'),(3,1,7,'fijo'),(4,1,8,'fijo'),(5,1,9,'fijo'),(6,1,10,'fijo'),(7,1,11,'fijo'),(8,1,12,'fijo'),(9,1,13,'fijo'),(10,1,14,'fijo'),(11,1,15,'fijo'),(12,1,16,'fijo'),(13,1,17,'fijo'),(14,1,18,'fijo'),(15,2,9,'fijo'),(16,2,10,'fijo'),(17,3,6,'fijo'),(18,3,7,'fijo'),(19,3,8,'fijo'),(20,3,9,'fijo'),(21,4,4,'fijo'),(22,4,5,'fijo'),(23,4,6,'fijo'),(24,4,13,'fijo'),(25,5,14,'fijo'),(26,5,15,'fijo'),(27,5,16,'fijo'),(28,5,17,'fijo'),(29,6,10,'fijo'),(30,6,11,'fijo'),(31,6,12,'fijo'),(32,6,13,'fijo'),(33,6,14,'fijo'),(34,7,14,'fijo'),(35,7,15,'fijo'),(36,7,16,'fijo');




DROP TABLE IF EXISTS `Torneos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Torneos` (
  `id_torneo` int NOT NULL AUTO_INCREMENT,
  `nombre_torneo` varchar(150) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  PRIMARY KEY (`id_torneo`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `Torneos` VALUES (1,'Apertura 2026','2026-07-01','2026-12-15'),(2,'Clausura 2026','2027-01-10','2027-05-10');




DROP TABLE IF EXISTS `Partidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Partidos` (
  `id_partido` int NOT NULL AUTO_INCREMENT,
  `nombre_partido` varchar(150) NOT NULL,
  `jornada` int NOT NULL,
  `fecha` datetime NOT NULL,
  `id_torneo` int NOT NULL,
  PRIMARY KEY (`id_partido`),
  KEY `fk_torneo_partido` (`id_torneo`),
  CONSTRAINT `fk_torneo_partido` FOREIGN KEY (`id_torneo`) REFERENCES `Torneos` (`id_torneo`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `Partidos` VALUES (1,'Chivas vs Toluca',1,'2026-07-28 20:00:00',1),(2,'Chivas vs Juarez',2,'2026-10-10 19:00:00',1),(3,'Chivas vs Tijuana',5,'2026-09-26 19:00:00',1),(4,'Chivas vs Puma',8,'2026-09-23 17:00:00',1),(5,'Chivas vs Querétaro',10,'2026-09-22 19:00:00',1),(6,'Chivas vs Tigres',12,'2026-09-30 19:00:00',1),(7,'Chivas vs Necaxa',13,'2026-10-14 19:00:00',1),(8,'Chivas vs Necaxa',15,'2026-10-10 19:00:00',1),(9,'Chivas vs Necaxa',17,'2026-10-14 19:00:00',1),(10,'Chivas vs America',18,'2026-09-24 19:00:00',1),(11,'Chivas vs Atlante',1,'2027-02-09 19:00:00',2);




DROP TABLE IF EXISTS `Usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` enum('admin','editor') NOT NULL DEFAULT 'editor',
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `Usuarios` VALUES (1,'Axel Ortiz','admin@estadio.com','$2b$10$iMaCRoj9eL6O92OpjkBkgOdiv4nq8cGtznG1XG0vfZFwVRMFDILua','admin');




DROP TABLE IF EXISTS `Asientos_Por_Partido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Asientos_Por_Partido` (
  `id_asiento_partido` int NOT NULL AUTO_INCREMENT,
  `id_partido` int NOT NULL,
  `id_asiento` int NOT NULL,
  `estado` enum('disponible','apartado','vendido') NOT NULL DEFAULT 'disponible',
  PRIMARY KEY (`id_asiento_partido`),
  UNIQUE KEY `id_partido` (`id_partido`,`id_asiento`),
  KEY `id_asiento` (`id_asiento`),
  CONSTRAINT `asientos_por_partido_ibfk_1` FOREIGN KEY (`id_partido`) REFERENCES `Partidos` (`id_partido`),
  CONSTRAINT `asientos_por_partido_ibfk_2` FOREIGN KEY (`id_asiento`) REFERENCES `Asientos` (`id_asiento`)
) ENGINE=InnoDB AUTO_INCREMENT=452 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `Asientos_Por_Partido` VALUES (1,2,1,'disponible'),(2,1,1,'vendido'),(3,2,2,'apartado'),(4,1,2,'vendido'),(5,2,3,'apartado'),(6,1,3,'vendido'),(7,2,4,'apartado'),(8,1,4,'vendido'),(9,2,5,'apartado'),(10,1,5,'vendido'),(11,2,6,'disponible'),(12,1,6,'apartado'),(13,2,7,'apartado'),(14,1,7,'apartado'),(15,2,8,'vendido'),(16,1,8,'apartado'),(17,2,9,'vendido'),(18,1,9,'apartado'),(19,2,10,'vendido'),(20,1,10,'vendido'),(21,2,11,'disponible'),(22,1,11,'disponible'),(23,2,12,'disponible'),(24,1,12,'disponible'),(25,2,13,'disponible'),(26,1,13,'disponible'),(27,2,14,'disponible'),(28,1,14,'disponible'),(29,2,15,'disponible'),(30,1,15,'vendido'),(31,2,16,'disponible'),(32,1,16,'vendido'),(33,2,17,'disponible'),(34,1,17,'disponible'),(35,2,18,'disponible'),(36,1,18,'apartado'),(37,2,19,'disponible'),(38,1,19,'disponible'),(39,2,20,'disponible'),(40,1,20,'apartado'),(41,2,21,'disponible'),(42,1,21,'apartado'),(43,2,22,'disponible'),(44,1,22,'apartado'),(45,2,23,'disponible'),(46,1,23,'apartado'),(47,2,24,'disponible'),(48,1,24,'apartado'),(49,2,25,'disponible'),(50,1,25,'disponible'),(51,2,26,'disponible'),(52,1,26,'disponible'),(53,2,27,'disponible'),(54,1,27,'apartado'),(55,2,28,'disponible'),(56,1,28,'disponible'),(57,2,29,'disponible'),(58,1,29,'disponible'),(59,2,30,'disponible'),(60,1,30,'apartado'),(61,2,31,'disponible'),(62,1,31,'vendido'),(63,2,32,'disponible'),(64,1,32,'apartado'),(65,2,33,'disponible'),(66,1,33,'disponible'),(67,2,34,'disponible'),(68,1,34,'disponible'),(69,2,35,'disponible'),(70,1,35,'apartado'),(71,2,36,'disponible'),(72,1,36,'disponible'),(128,3,1,'disponible'),(129,3,2,'disponible'),(130,3,3,'disponible'),(131,3,4,'disponible'),(132,3,5,'apartado'),(133,3,6,'disponible'),(134,3,7,'disponible'),(135,3,8,'disponible'),(136,3,9,'disponible'),(137,3,10,'disponible'),(138,3,11,'disponible'),(139,3,12,'disponible'),(140,3,13,'disponible'),(141,3,14,'disponible'),(142,3,15,'disponible'),(143,3,16,'disponible'),(144,3,17,'disponible'),(145,3,18,'disponible'),(146,3,19,'disponible'),(147,3,20,'disponible'),(148,3,21,'disponible'),(149,3,22,'disponible'),(150,3,23,'disponible'),(151,3,24,'disponible'),(152,3,25,'disponible'),(153,3,26,'disponible'),(154,3,27,'disponible'),(155,3,28,'disponible'),(156,3,29,'disponible'),(157,3,30,'disponible'),(158,3,31,'disponible'),(159,3,32,'disponible'),(160,3,33,'disponible'),(161,3,34,'disponible'),(162,3,35,'disponible'),(163,3,36,'disponible'),(164,4,1,'disponible'),(165,4,2,'disponible'),(166,4,3,'disponible'),(167,4,4,'disponible'),(168,4,5,'disponible'),(169,4,6,'disponible'),(170,4,7,'disponible'),(171,4,8,'disponible'),(172,4,9,'disponible'),(173,4,10,'disponible'),(174,4,11,'disponible'),(175,4,12,'disponible'),(176,4,13,'disponible'),(177,4,14,'disponible'),(178,4,15,'disponible'),(179,4,16,'disponible'),(180,4,17,'disponible'),(181,4,18,'disponible'),(182,4,19,'disponible'),(183,4,20,'disponible'),(184,4,21,'disponible'),(185,4,22,'disponible'),(186,4,23,'disponible'),(187,4,24,'disponible'),(188,4,25,'disponible'),(189,4,26,'disponible'),(190,4,27,'disponible'),(191,4,28,'disponible'),(192,4,29,'disponible'),(193,4,30,'disponible'),(194,4,31,'disponible'),(195,4,32,'disponible'),(196,4,33,'disponible'),(197,4,34,'disponible'),(198,4,35,'disponible'),(199,4,36,'disponible'),(200,5,1,'disponible'),(201,5,2,'disponible'),(202,5,3,'vendido'),(203,5,4,'vendido'),(204,5,5,'disponible'),(205,5,6,'apartado'),(206,5,7,'disponible'),(207,5,8,'disponible'),(208,5,9,'disponible'),(209,5,10,'disponible'),(210,5,11,'disponible'),(211,5,12,'disponible'),(212,5,13,'disponible'),(213,5,14,'disponible'),(214,5,15,'disponible'),(215,5,16,'apartado'),(216,5,17,'disponible'),(217,5,18,'disponible'),(218,5,19,'apartado'),(219,5,20,'disponible'),(220,5,21,'disponible'),(221,5,22,'disponible'),(222,5,23,'apartado'),(223,5,24,'disponible'),(224,5,25,'disponible'),(225,5,26,'vendido'),(226,5,27,'vendido'),(227,5,28,'vendido'),(228,5,29,'apartado'),(229,5,30,'vendido'),(230,5,31,'apartado'),(231,5,32,'vendido'),(232,5,33,'disponible'),(233,5,34,'apartado'),(234,5,35,'apartado'),(235,5,36,'disponible'),(236,6,1,'disponible'),(237,6,2,'disponible'),(238,6,3,'disponible'),(239,6,4,'disponible'),(240,6,5,'disponible'),(241,6,6,'disponible'),(242,6,7,'disponible'),(243,6,8,'disponible'),(244,6,9,'disponible'),(245,6,10,'disponible'),(246,6,11,'disponible'),(247,6,12,'disponible'),(248,6,13,'disponible'),(249,6,14,'disponible'),(250,6,15,'disponible'),(251,6,16,'disponible'),(252,6,17,'disponible'),(253,6,18,'disponible'),(254,6,19,'disponible'),(255,6,20,'disponible'),(256,6,21,'disponible'),(257,6,22,'disponible'),(258,6,23,'disponible'),(259,6,24,'disponible'),(260,6,25,'disponible'),(261,6,26,'disponible'),(262,6,27,'disponible'),(263,6,28,'disponible'),(264,6,29,'disponible'),(265,6,30,'disponible'),(266,6,31,'disponible'),(267,6,32,'disponible'),(268,6,33,'disponible'),(269,6,34,'disponible'),(270,6,35,'disponible'),(271,6,36,'disponible'),(272,7,1,'disponible'),(273,7,2,'disponible'),(274,7,3,'disponible'),(275,7,4,'apartado'),(276,7,5,'disponible'),(277,7,6,'disponible'),(278,7,7,'disponible'),(279,7,8,'disponible'),(280,7,9,'disponible'),(281,7,10,'disponible'),(282,7,11,'disponible'),(283,7,12,'disponible'),(284,7,13,'disponible'),(285,7,14,'disponible'),(286,7,15,'disponible'),(287,7,16,'disponible'),(288,7,17,'disponible'),(289,7,18,'disponible'),(290,7,19,'disponible'),(291,7,20,'disponible'),(292,7,21,'disponible'),(293,7,22,'disponible'),(294,7,23,'disponible'),(295,7,24,'disponible'),(296,7,25,'disponible'),(297,7,26,'disponible'),(298,7,27,'disponible'),(299,7,28,'disponible'),(300,7,29,'disponible'),(301,7,30,'disponible'),(302,7,31,'disponible'),(303,7,32,'disponible'),(304,7,33,'disponible'),(305,7,34,'disponible'),(306,7,35,'disponible'),(307,7,36,'disponible'),(308,8,1,'disponible'),(309,8,2,'disponible'),(310,8,3,'disponible'),(311,8,4,'disponible'),(312,8,5,'disponible'),(313,8,6,'disponible'),(314,8,7,'disponible'),(315,8,8,'disponible'),(316,8,9,'disponible'),(317,8,10,'disponible'),(318,8,11,'disponible'),(319,8,12,'disponible'),(320,8,13,'disponible'),(321,8,14,'disponible'),(322,8,15,'disponible'),(323,8,16,'disponible'),(324,8,17,'disponible'),(325,8,18,'disponible'),(326,8,19,'disponible'),(327,8,20,'disponible'),(328,8,21,'disponible'),(329,8,22,'disponible'),(330,8,23,'disponible'),(331,8,24,'disponible'),(332,8,25,'disponible'),(333,8,26,'disponible'),(334,8,27,'disponible'),(335,8,28,'disponible'),(336,8,29,'disponible'),(337,8,30,'disponible'),(338,8,31,'disponible'),(339,8,32,'disponible'),(340,8,33,'disponible'),(341,8,34,'disponible'),(342,8,35,'disponible'),(343,8,36,'disponible'),(344,9,1,'disponible'),(345,9,2,'disponible'),(346,9,3,'disponible'),(347,9,4,'disponible'),(348,9,5,'disponible'),(349,9,6,'disponible'),(350,9,7,'disponible'),(351,9,8,'disponible'),(352,9,9,'disponible'),(353,9,10,'disponible'),(354,9,11,'disponible'),(355,9,12,'disponible'),(356,9,13,'disponible'),(357,9,14,'disponible'),(358,9,15,'disponible'),(359,9,16,'disponible'),(360,9,17,'disponible'),(361,9,18,'disponible'),(362,9,19,'disponible'),(363,9,20,'disponible'),(364,9,21,'disponible'),(365,9,22,'disponible'),(366,9,23,'disponible'),(367,9,24,'disponible'),(368,9,25,'disponible'),(369,9,26,'disponible'),(370,9,27,'disponible'),(371,9,28,'disponible'),(372,9,29,'disponible'),(373,9,30,'disponible'),(374,9,31,'disponible'),(375,9,32,'disponible'),(376,9,33,'disponible'),(377,9,34,'disponible'),(378,9,35,'disponible'),(379,9,36,'disponible'),(380,10,1,'disponible'),(381,10,2,'disponible'),(382,10,3,'disponible'),(383,10,4,'disponible'),(384,10,5,'disponible'),(385,10,6,'disponible'),(386,10,7,'disponible'),(387,10,8,'disponible'),(388,10,9,'disponible'),(389,10,10,'disponible'),(390,10,11,'disponible'),(391,10,12,'disponible'),(392,10,13,'disponible'),(393,10,14,'disponible'),(394,10,15,'disponible'),(395,10,16,'disponible'),(396,10,17,'disponible'),(397,10,18,'disponible'),(398,10,19,'disponible'),(399,10,20,'disponible'),(400,10,21,'disponible'),(401,10,22,'disponible'),(402,10,23,'disponible'),(403,10,24,'disponible'),(404,10,25,'disponible'),(405,10,26,'disponible'),(406,10,27,'disponible'),(407,10,28,'disponible'),(408,10,29,'disponible'),(409,10,30,'disponible'),(410,10,31,'disponible'),(411,10,32,'disponible'),(412,10,33,'disponible'),(413,10,34,'disponible'),(414,10,35,'disponible'),(415,10,36,'disponible'),(416,11,1,'disponible'),(417,11,2,'apartado'),(418,11,3,'apartado'),(419,11,4,'apartado'),(420,11,5,'disponible'),(421,11,6,'disponible'),(422,11,7,'disponible'),(423,11,8,'disponible'),(424,11,9,'disponible'),(425,11,10,'disponible'),(426,11,11,'disponible'),(427,11,12,'disponible'),(428,11,13,'disponible'),(429,11,14,'disponible'),(430,11,15,'disponible'),(431,11,16,'disponible'),(432,11,17,'disponible'),(433,11,18,'disponible'),(434,11,19,'disponible'),(435,11,20,'disponible'),(436,11,21,'disponible'),(437,11,22,'disponible'),(438,11,23,'disponible'),(439,11,24,'disponible'),(440,11,25,'disponible'),(441,11,26,'disponible'),(442,11,27,'disponible'),(443,11,28,'disponible'),(444,11,29,'disponible'),(445,11,30,'disponible'),(446,11,31,'disponible'),(447,11,32,'disponible'),(448,11,33,'disponible'),(449,11,34,'disponible'),(450,11,35,'disponible'),(451,11,36,'disponible');




DROP TABLE IF EXISTS `Historial_Cambios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Historial_Cambios` (
  `id_historial` int NOT NULL AUTO_INCREMENT,
  `id_asiento_partido` int NOT NULL,
  `id_usuario` int NOT NULL,
  `estado_anterior` varchar(20) DEFAULT NULL,
  `estado_nuevo` varchar(20) NOT NULL,
  `fecha_cambio` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historial`),
  KEY `id_asiento_partido` (`id_asiento_partido`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `historial_cambios_ibfk_1` FOREIGN KEY (`id_asiento_partido`) REFERENCES `Asientos_Por_Partido` (`id_asiento_partido`),
  CONSTRAINT `historial_cambios_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `Usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `Historial_Cambios` VALUES (1,6,1,'disponible','apartado','2026-09-22 00:07:17'),(2,6,1,'apartado','disponible','2026-09-22 00:07:19'),(3,30,1,'disponible','vendido','2026-09-22 00:08:25'),(4,29,1,'disponible','apartado','2026-09-22 00:08:29'),(5,12,1,'disponible','apartado','2026-09-22 00:17:20'),(6,12,1,'apartado','vendido','2026-09-22 00:17:22'),(7,12,1,'vendido','disponible','2026-09-22 00:17:31'),(8,29,1,'apartado','disponible','2026-09-22 01:48:05'),(9,30,1,'vendido','disponible','2026-09-22 01:48:28'),(10,6,1,'disponible','apartado','2026-09-22 02:16:23'),(11,6,1,'apartado','disponible','2026-09-22 02:17:54'),(12,10,1,'disponible','apartado','2026-09-22 03:45:17'),(13,10,1,'apartado','disponible','2026-09-22 03:45:19'),(14,10,1,'disponible','apartado','2026-09-22 03:47:40'),(15,10,1,'apartado','disponible','2026-09-22 03:47:42'),(16,10,1,'disponible','apartado','2026-09-22 03:48:42'),(17,10,1,'apartado','disponible','2026-09-22 03:48:45'),(18,10,1,'disponible','apartado','2026-09-22 03:50:32'),(19,10,1,'apartado','disponible','2026-09-22 03:50:37'),(20,40,2,'disponible','apartado','2026-09-22 04:05:01'),(21,44,3,'disponible','apartado','2026-09-22 04:41:53'),(22,46,3,'disponible','apartado','2026-09-22 04:41:54'),(23,48,3,'disponible','apartado','2026-09-22 04:41:57'),(24,2,2,'disponible','vendido','2026-09-22 19:27:17'),(25,4,2,'disponible','vendido','2026-09-22 19:27:21'),(26,6,2,'disponible','vendido','2026-09-22 19:27:23'),(27,14,2,'disponible','apartado','2026-09-22 19:28:00'),(28,18,2,'disponible','apartado','2026-09-22 19:28:02'),(29,16,2,'disponible','apartado','2026-09-22 19:28:03'),(30,60,2,'disponible','apartado','2026-09-22 19:28:06'),(31,54,2,'disponible','apartado','2026-09-22 19:28:08'),(32,64,2,'disponible','apartado','2026-09-22 19:28:10'),(33,70,2,'disponible','apartado','2026-09-22 19:28:12'),(34,205,2,'disponible','apartado','2026-09-22 19:28:16'),(35,218,2,'disponible','apartado','2026-09-22 19:28:18'),(36,222,2,'disponible','apartado','2026-09-22 19:28:20'),(37,225,2,'disponible','vendido','2026-09-22 19:28:22'),(38,226,2,'disponible','vendido','2026-09-22 19:28:23'),(39,227,2,'disponible','vendido','2026-09-22 19:28:24'),(40,231,2,'disponible','vendido','2026-09-22 19:28:27'),(41,229,2,'disponible','vendido','2026-09-22 19:28:28'),(42,230,2,'disponible','apartado','2026-09-22 19:28:31'),(43,12,3,'disponible','apartado','2026-09-22 19:28:58'),(44,10,3,'disponible','vendido','2026-09-22 19:28:59'),(45,20,3,'disponible','vendido','2026-09-22 19:29:01'),(46,32,3,'disponible','vendido','2026-09-22 19:29:04'),(47,30,3,'disponible','vendido','2026-09-22 19:29:05'),(48,36,3,'disponible','apartado','2026-09-22 19:29:07'),(49,62,3,'disponible','vendido','2026-09-22 19:29:08'),(50,202,3,'disponible','vendido','2026-09-22 19:29:12'),(51,203,3,'disponible','vendido','2026-09-22 19:29:13'),(52,215,3,'disponible','apartado','2026-09-22 19:29:16'),(53,228,3,'disponible','apartado','2026-09-22 19:29:20'),(54,233,3,'disponible','apartado','2026-09-22 19:29:22'),(55,234,3,'disponible','apartado','2026-09-22 19:29:25'),(56,36,1,'apartado','disponible','2026-09-22 19:49:04'),(57,36,1,'disponible','apartado','2026-09-22 19:49:05'),(58,42,1,'disponible','apartado','2026-09-22 19:49:07'),(59,3,1,'disponible','apartado','2026-09-22 19:49:10'),(60,5,1,'disponible','apartado','2026-09-22 19:49:13'),(61,11,1,'disponible','vendido','2026-09-22 19:49:25'),(62,132,1,'disponible','apartado','2026-09-22 19:55:06'),(63,275,1,'disponible','apartado','2026-09-22 19:55:09'),(64,7,1,'disponible','apartado','2026-09-22 19:55:25'),(65,9,1,'disponible','apartado','2026-09-22 19:55:29'),(66,13,1,'disponible','apartado','2026-09-22 19:59:24'),(67,15,1,'disponible','vendido','2026-09-22 19:59:26'),(68,19,1,'disponible','vendido','2026-09-22 19:59:34'),(69,17,1,'disponible','vendido','2026-09-22 19:59:36'),(70,8,2,'disponible','apartado','2026-09-23 03:32:49'),(71,8,2,'apartado','vendido','2026-09-23 03:32:55'),(72,11,1,'vendido','disponible','2026-09-23 20:13:13'),(73,11,1,'disponible','apartado','2026-09-23 20:13:16'),(74,11,1,'apartado','disponible','2026-09-23 20:13:18'),(75,419,1,'disponible','apartado','2026-09-23 20:41:08'),(76,418,1,'disponible','apartado','2026-09-23 20:41:09'),(77,417,1,'disponible','apartado','2026-09-23 20:41:10');



SET FOREIGN_KEY_CHECKS = 1;

-- Fin del script