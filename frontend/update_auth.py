import os
import glob

search_dir = r"c:\Users\Script-Kid\Desktop\NiT-Student-Management\frontend\app\(portal)\admin"
for filepath in glob.glob(os.path.join(search_dir, "**", "page.tsx"), recursive=True):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We want to change the destructuring from useAuth() to include isAdminOrSales 
    # and then replace !isAdmin with !isAdminOrSales.
    # Case 1: const { isAdmin, loading } = useAuth(); -> const { isAdminOrSales, loading } = useAuth();
    content = content.replace("isAdmin, loading", "isAdminOrSales, loading")
    content = content.replace("loading, isAdmin", "loading, isAdminOrSales")
    
    # Case 2: if (!isAdmin) -> if (!isAdminOrSales)
    content = content.replace("!isAdmin", "!isAdminOrSales")
    
    # Case 3: if (isAdmin) -> if (isAdminOrSales)
    content = content.replace("if (isAdmin)", "if (isAdminOrSales)")
    content = content.replace(", isAdmin", ", isAdminOrSales")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
        
print("Frontend pages updated!")
