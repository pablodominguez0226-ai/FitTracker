import unittest
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, ensure_database_migration
from app import models, schemas
from app.db.seeds import seed_food_items
from app.routers import nutrition

class TestNutritionAndCustomRecipes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        cls.Session = sessionmaker(bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)
        
        with cls.Session() as db:
            # Create test user
            user = models.User(
                id=1,
                username="testpablo",
                email="testpablo@example.com",
                hashed_password="fakehashsecret",
                bodyweight=75.0,
            )
            db.add(user)
            db.commit()
            
            # Seed food items
            seed_food_items(db)

    def test_01_catalog_has_only_pure_raw_vegetables_and_fruits(self):
        with self.Session() as db:
            foods = db.query(models.FoodItem).all()
            self.assertGreater(len(foods), 0)

            forbidden = ["al horno", "al vapor", "cocid", "asada", "asado", "al aceite", "frit"]
            for f in foods:
                if f.category in ["verduras", "frutas", "ensaladas"]:
                    name_lower = f.name.lower()
                    for term in forbidden:
                        self.assertNotIn(term, name_lower, f"Alimento '{f.name}' contiene método de cocción en categoría {f.category}")
                    self.assertNotEqual(f.category, "ensaladas", "No debe existir categoría ensaladas con platos prefabricados")

            # Check specific raw items exist
            names = [f.name for f in foods]
            self.assertIn("Batata", names)
            self.assertIn("Papa", names)
            self.assertIn("Zapallo coreano", names)
            self.assertIn("Zanahoria", names)
            self.assertIn("Carne picada especial", names)
            self.assertIn("Pechuga de pollo", names)

    def test_02_create_custom_recipe_burger_zapallo_carne_zanahoria(self):
        with self.Session() as db:
            user = db.query(models.User).filter_by(username="testpablo").first()
            zapallo = db.query(models.FoodItem).filter_by(name="Zapallo coreano").first()
            carne = db.query(models.FoodItem).filter_by(name="Carne picada especial").first()
            zanahoria = db.query(models.FoodItem).filter_by(name="Zanahoria").first()

            self.assertIsNotNone(zapallo)
            self.assertIsNotNone(carne)
            self.assertIsNotNone(zanahoria)

            # Burger: 10g zapallo, 25g carne, 5g zanahoria = 40g por unidad
            payload = schemas.CustomRecipeCreate(
                name="Burger casera zapallo, carne y zanahoria",
                total_weight_g=40.0,
                ingredients=[
                    schemas.RecipeIngredientItem(
                        food_id=zapallo.id,
                        name=zapallo.name,
                        grams=10.0,
                    ),
                    schemas.RecipeIngredientItem(
                        food_id=carne.id,
                        name=carne.name,
                        grams=25.0,
                    ),
                    schemas.RecipeIngredientItem(
                        food_id=zanahoria.id,
                        name=zanahoria.name,
                        grams=5.0,
                    ),
                ],
                servings=1,
            )

            recipe_out = nutrition.create_custom_recipe(payload, db=db, current_user=user)
            self.assertEqual(recipe_out.name, "Burger casera zapallo, carne y zanahoria")
            self.assertEqual(recipe_out.total_weight_g, 40.0)

            # Verificación del cálculo proporcional:
            # Zapallo: 10g * 32 / 100 = 3.2 kcal, 0.1g P, 0.7g C, 0.02g G
            # Carne: 25g * 170 / 100 = 42.5 kcal, 5.5g P, 0.0g C, 2.25g G
            # Zanahoria: 5g * 35 / 100 = 1.75 kcal, 0.04g P, 0.4g C, 0.01g G
            # Total batch: 40g -> 47.45 kcal, 5.64g P, 1.1g C, 2.28g G
            self.assertAlmostEqual(recipe_out.calculated_calories, 47.5, delta=0.5)
            self.assertAlmostEqual(recipe_out.calculated_protein, 5.6, delta=0.5)
            self.assertAlmostEqual(recipe_out.calculated_carbs, 1.1, delta=0.5)
            self.assertAlmostEqual(recipe_out.calculated_fat, 2.3, delta=0.5)

            # Retrieve recipes
            recipes = nutrition.get_custom_recipes(db=db, current_user=user)
            self.assertEqual(len(recipes), 1)
            self.assertEqual(recipes[0].name, "Burger casera zapallo, carne y zanahoria")

    def test_03_log_custom_recipe_multiple_units(self):
        with self.Session() as db:
            user = db.query(models.User).filter_by(username="testpablo").first()
            recipe = db.query(models.CustomRecipe).filter_by(name="Burger casera zapallo, carne y zanahoria").first()
            self.assertIsNotNone(recipe)

            # Consumir 5 unidades: 5 * 40g = 200g
            units = 5
            total_cals = round(recipe.calculated_calories * units, 1)
            total_prot = round(recipe.calculated_protein * units, 1)
            total_carbs = round(recipe.calculated_carbs * units, 1)
            total_fat = round(recipe.calculated_fat * units, 1)

            log_payload = schemas.FoodLogCreate(
                food_name=recipe.name,
                grams_or_units=f"{units} unidades (~200g)",
                calories=total_cals,
                protein=total_prot,
                carbs=total_carbs,
                fat=total_fat,
                recipe_id=recipe.id,
                meal_type="almuerzo",
            )

            logged = nutrition.log_food(log_payload, db=db, current_user=user)
            self.assertEqual(logged.food_name, "Burger casera zapallo, carne y zanahoria")
            self.assertEqual(logged.calories, total_cals)
            self.assertEqual(logged.protein, total_prot)
            self.assertEqual(logged.grams_or_units, "5 unidades (~200g)")

            # Check daily nutrition accumulated log
            daily_nutri = db.query(models.DailyNutritionLog).filter_by(user_id=user.id).first()
            self.assertIsNotNone(daily_nutri)
            self.assertAlmostEqual(daily_nutri.calories_consumed, total_cals, delta=0.1)

    def test_04_log_raw_vegetable_with_cooking_methods(self):
        with self.Session() as db:
            user = db.query(models.User).filter_by(username="testpablo").first()
            papa = db.query(models.FoodItem).filter_by(name="Papa").first()
            self.assertIsNotNone(papa)

            # 1. Papa (Al horno con aceite - 1 cda): base 150g = 115.5 kcal + 90 kcal aceite = 205.5 kcal
            raw_grams = 150.0
            base_cals = (papa.calories_100g * raw_grams) / 100.0 # 115.5
            oil_cals = 90.0
            oil_fat = 10.0
            base_fat = (papa.fat_100g * raw_grams) / 100.0 # 0.15

            log_oil = schemas.FoodLogCreate(
                food_name="Papa (Salteado / Al horno con aceite - 1 cda)",
                grams_or_units="150g crudo",
                calories=round(base_cals + oil_cals, 1),
                protein=round((papa.protein_100g * raw_grams) / 100.0, 1),
                carbs=round((papa.carbs_100g * raw_grams) / 100.0, 1),
                fat=round(base_fat + oil_fat, 1),
                food_id=papa.id,
                meal_type="cena",
            )
            logged_oil = nutrition.log_food(log_oil, db=db, current_user=user)
            self.assertIn("Al horno con aceite", logged_oil.food_name)
            self.assertEqual(logged_oil.calories, 205.5)
            self.assertEqual(logged_oil.fat, 10.2)


if __name__ == "__main__":
    unittest.main()
